"""Evaluation orchestration: run all rubrics over a project and persist the result."""
from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.audit import record_audit_log
from app.evaluations.dimensions import (
    claim_texts_from_artifacts,
    completeness_score,
    consistency_score,
    groundedness_from_lexical,
    groundedness_from_vectors,
    overall_score,
)
from app.ingestion.embeddings import EmbeddingProviderError, embed_texts
from app.models import (
    Artifact,
    ArtifactVersion,
    Evaluation,
    EvaluationStatus,
    Requirement,
    User,
)
from app.traceability.matrix import matrix_from_artifact_rows

logger = logging.getLogger("devpilot.evaluations")


class EmptyProjectError(ValueError):
    """Raised when an evaluation runs against a project with no requirements."""


def _latest_artifact_payloads(rows: list[ArtifactVersion]) -> list[dict]:
    """Pick the latest version per artifact and return its payload + metadata."""
    picks: dict[uuid.UUID, dict] = {}
    for version in sorted(rows, key=lambda v: v.version_number):
        artifact: Artifact = version.artifact
        artifact_type = (
            artifact.artifact_type.value
            if hasattr(artifact.artifact_type, "value")
            else str(artifact.artifact_type)
        )
        picks[artifact.id] = {
            "artifact_id": str(artifact.id),
            "artifact_type": artifact_type,
            "title": artifact.title,
            "version_number": version.version_number,
            "payload": version.payload if isinstance(version.payload, dict) else {},
        }
    return list(picks.values())


async def _groundedness_rubric(
    claims: list[dict[str, str]],
    source_texts: list[str],
) -> dict[str, Any]:
    """Embedding-based grounding with automatic lexical fallback (never hard-fails)."""
    if not claims:
        return {
            "score": 1.0,
            "method": "embedding",
            "claims": [],
            "hallucinated": [],
            "grounded_ratio": 1.0,
        }
    try:
        vectors = await embed_texts([claim["text"] for claim in claims] + list(source_texts))
        claim_vectors = vectors[: len(claims)]
        source_vectors = vectors[len(claims):]
        if claim_vectors and source_vectors and len(claim_vectors) == len(claims):
            return groundedness_from_vectors(claims, source_texts, claim_vectors, source_vectors)
    except EmbeddingProviderError as exc:
        logger.warning("Embedding provider unavailable, using lexical fallback: %s", exc)
    return groundedness_from_lexical(claims, source_texts)


async def run_project_evaluation(
    session,
    project_id: uuid.UUID,
    user: User,
    triggered_by: str = "api",
) -> Evaluation:
    """Run completeness/groundedness/consistency rubrics for a project's latest artifacts."""
    evaluation = Evaluation(
        project_id=project_id,
        status=EvaluationStatus.running,
        triggered_by=triggered_by,
        created_at=datetime.now(UTC),
        created_by=user.id,
    )
    session.add(evaluation)
    await session.flush()
    evaluation_id = evaluation.id

    try:
        requirements = list(
            (await session.execute(
                select(Requirement)
                .where(Requirement.project_id == project_id)
                .order_by(Requirement.requirement_key)
            )).scalars().all()
        )
        if not requirements:
            raise EmptyProjectError(
                "No requirements ingested for this project; ingest requirements before running an evaluation."
            )

        version_rows = list(
            (await session.execute(
                select(ArtifactVersion)
                .join(Artifact, Artifact.id == ArtifactVersion.artifact_id)
                .where(Artifact.project_id == project_id)
                .options(selectinload(ArtifactVersion.artifact))
                .order_by(ArtifactVersion.version_number)
            )).scalars().all()
        )
        artifacts_payloads = _latest_artifact_payloads(version_rows)

        # 1. Traceability matrix drives the completeness rubric and gap analysis.
        matrix, version_numbers = matrix_from_artifact_rows(requirements, version_rows)
        completeness = completeness_score(matrix)

        # 2. Groundedness: claims vs. requirement text (embedding, lexical fallback).
        claims = claim_texts_from_artifacts(artifacts_payloads)
        source_texts = [requirement.description for requirement in requirements]
        grounding = await _groundedness_rubric(claims, source_texts)

        # 3. Consistency across artifact families.
        stories_payloads = [entry["payload"] for entry in artifacts_payloads if entry["artifact_type"] == "user_stories"]
        criteria_payloads = [entry["payload"] for entry in artifacts_payloads if entry["artifact_type"] == "acceptance_criteria"]
        tests_payloads = [entry["payload"] for entry in artifacts_payloads if entry["artifact_type"] == "test_cases"]
        spec_payloads = [entry["payload"] for entry in artifacts_payloads if entry["artifact_type"] == "api_specification"]
        consistency = consistency_score(stories_payloads, criteria_payloads, tests_payloads, spec_payloads[0] if spec_payloads else None)

        overall = overall_score(
            float(completeness["score"]),
            float(grounding["score"]),
            float(consistency["score"]),
        )

        issues: list[dict] = [gap.model_dump() for gap in matrix.gaps]
        for claim in grounding.get("hallucinated", []):
            issues.append({
                "type": "hallucinated_claim",
                "kind": claim["artifact_type"],
                "key": claim["origin_key"],
                "detail": (
                    f"Claim '{claim['origin_key']}' ({claim['artifact_type']}) matches no source "
                    f"requirement text (max similarity {claim['similarity']})."
                ),
            })
        for violation in consistency["violations"]:
            issues.append({
                "type": violation["type"],
                "key": violation["origin_key"],
                "detail": violation["detail"],
            })

        scores = {
            "completeness": completeness["score"],
            "groundedness": grounding["score"],
            "consistency": consistency["score"],
            "overall": overall,
        }

        artifact_stats: dict[str, Any] = {
            "artifact_count": len(artifacts_payloads),
            "types": {
                artifact_type: sum(1 for entry in artifacts_payloads if entry["artifact_type"] == artifact_type)
                for artifact_type in {entry["artifact_type"] for entry in artifacts_payloads}
            },
            "latest_version_numbers": version_numbers,
        }
        metrics = {
            "coverage": {
                "requirements_total": matrix.requirements_total,
                "requirements_covered": matrix.requirements_covered,
                "per_requirement": completeness["breakdown"],
            },
            "grounding": {
                "claims_checked": len(claims),
                "grounded_ratio": grounding.get("grounded_ratio"),
                "hallucinated_count": len(grounding.get("hallucinated", [])),
            },
            "consistency": {
                "violations_count": len(consistency["violations"]),
            },
        }
        summary = (
            f"Overall {overall:.2f}: {matrix.requirements_covered}/{matrix.requirements_total} requirements fully traced, "
            f"groundedness {grounding['score']:.2f} ({grounding['method']}, "
            f"{len(grounding.get('hallucinated', []))} hallucination flags), "
            f"consistency {consistency['score']:.2f} ({len(consistency['violations'])} violations)."
        )

        evaluation.status = EvaluationStatus.completed
        evaluation.completed_at = datetime.now(UTC)
        evaluation.artifact_stats = artifact_stats
        evaluation.metrics = metrics
        evaluation.scores = scores
        evaluation.issues = issues
        evaluation.summary = summary
        evaluation.rubric_metadata = {
            "grounding_method": grounding.get("method"),
            "traceability": matrix.model_dump(),
            "claim_details": grounding.get("claims", []),
        }

        await record_audit_log(
            session,
            action="EVALUATION_RUN",
            user_id=user.id,
            entity_type="evaluation",
            entity_id=str(evaluation_id),
            entity_title=f"Evaluation {project_id}",
            details={"project_id": str(project_id), "overall": overall, "triggered_by": triggered_by},
        )
        await session.commit()
    except EmptyProjectError:
        await session.delete(evaluation)
        await session.commit()
        raise
    except Exception as exc:  # persist the failure, then surface it
        logger.exception("Evaluation failed for project %s", project_id)
        evaluation.status = EvaluationStatus.failed
        evaluation.completed_at = datetime.now(UTC)
        evaluation.issues = [{"type": "evaluation_error", "detail": str(exc)}]
        evaluation.summary = f"Evaluation failed: {exc}"
        await record_audit_log(
            session,
            action="EVALUATION_FAILED",
            user_id=user.id,
            entity_type="evaluation",
            entity_id=str(evaluation_id),
            entity_title=f"Evaluation {project_id}",
            details={"project_id": str(project_id), "error": str(exc), "triggered_by": triggered_by},
        )
        await session.commit()
        raise
    return evaluation
