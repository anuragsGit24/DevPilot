"""Traceability matrix REST endpoints (Engineer 4 & Engineer 5, UC-08)."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, get_client_ip, verify_project_access
from app.core.audit import record_audit_log
from app.models import Artifact, ArtifactVersion, Requirement, WorkItem
from app.schemas import TraceabilityLink, TraceabilityMatrixResponse
from app.traceability.matrix import matrix_from_artifact_rows

router = APIRouter(prefix="/projects/{project_id}/traceability", tags=["traceability"])


@router.get("/matrix", response_model=TraceabilityMatrixResponse)
async def get_traceability_matrix(
    request: Request,
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> TraceabilityMatrixResponse:
    await verify_project_access(project_id, current_user, session, "requirements:view")

    requirements = list(
        (await session.execute(
            select(Requirement)
            .where(Requirement.project_id == project_id)
            .order_by(Requirement.requirement_key)
        )).scalars().all()
    )
    versions = list(
        (await session.execute(
            select(ArtifactVersion)
            .join(Artifact, Artifact.id == ArtifactVersion.artifact_id)
            .where(Artifact.project_id == project_id)
            .options(selectinload(ArtifactVersion.artifact))
            .order_by(ArtifactVersion.version_number)
        )).scalars().all()
    )
    if not requirements:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No requirements ingested yet; upload requirements before generating a traceability matrix.",
        )

    # Support WorkItem records alongside versioned artifacts
    work_items = list(
        (await session.execute(
            select(WorkItem).where(WorkItem.project_id == project_id)
        )).scalars().all()
    )
    if work_items:
        existing_types = {
            v.artifact.artifact_type.value if hasattr(v.artifact.artifact_type, "value") else str(v.artifact.artifact_type)
            for v in versions if getattr(v, "artifact", None)
        }
        synthetic_versions = []
        if "user_stories" not in existing_types:
            stories = []
            for wi in work_items:
                if wi.record_type == "user_story":
                    p = wi.payload or {}
                    s_key = p.get("story_key") or p.get("id") or str(wi.id)
                    req_keys = p.get("source_requirement_keys") or p.get("sourceRequirementIds") or p.get("source_requirement_ids") or []
                    stories.append({
                        "story_key": s_key,
                        "title": wi.title or p.get("title", ""),
                        "source_requirement_keys": req_keys,
                    })
            if stories:
                art = type("SyntheticArtifact", (), {"id": uuid.uuid4(), "artifact_type": "user_stories", "title": "User Stories"})()
                ver = type("SyntheticVersion", (), {"artifact": art, "version_number": 1, "payload": {"stories": stories}, "source_requirement_ids": None})()
                synthetic_versions.append(ver)

        if "acceptance_criteria" not in existing_types:
            criteria = []
            for wi in work_items:
                if wi.record_type == "acceptance_criteria":
                    p = wi.payload or {}
                    c_key = p.get("criteria_key") or p.get("id") or str(wi.id)
                    st_key = p.get("story_key") or p.get("storyId") or p.get("user_story_id")
                    req_keys = p.get("source_requirement_keys") or p.get("sourceRequirementIds") or p.get("source_requirement_ids") or []
                    criteria.append({
                        "criteria_key": c_key,
                        "story_key": st_key,
                        "source_requirement_keys": req_keys,
                    })
            if criteria:
                art = type("SyntheticArtifact", (), {"id": uuid.uuid4(), "artifact_type": "acceptance_criteria", "title": "Acceptance Criteria"})()
                ver = type("SyntheticVersion", (), {"artifact": art, "version_number": 1, "payload": {"acceptance_criteria": criteria}, "source_requirement_ids": None})()
                synthetic_versions.append(ver)

        if "test_cases" not in existing_types:
            tests = []
            for wi in work_items:
                if wi.record_type == "test_case":
                    p = wi.payload or {}
                    t_key = p.get("test_key") or p.get("id") or str(wi.id)
                    req_keys = p.get("source_requirement_keys") or p.get("sourceRequirementIds") or p.get("source_requirement_ids") or []
                    tests.append({
                        "test_key": t_key,
                        "title": wi.title or p.get("title", ""),
                        "source_requirement_keys": req_keys,
                    })
            if tests:
                art = type("SyntheticArtifact", (), {"id": uuid.uuid4(), "artifact_type": "test_cases", "title": "Test Cases"})()
                ver = type("SyntheticVersion", (), {"artifact": art, "version_number": 1, "payload": {"test_cases": tests}, "source_requirement_ids": None})()
                synthetic_versions.append(ver)

        versions = versions + synthetic_versions

    matrix, version_numbers = matrix_from_artifact_rows(requirements, versions)

    await record_audit_log(
        session,
        action="TRACEABILITY_MATRIX_VIEWED",
        user_id=current_user.id,
        entity_type="project",
        entity_id=str(project_id),
        ip_address=get_client_ip(request),
        details={
            "requirements": matrix.requirements_total,
            "covered": matrix.requirements_covered,
            "gaps": len(matrix.gaps),
        },
    )
    await session.commit()

    links = [
        TraceabilityLink(
            requirement_id=row.requirement_key,
            requirement_title=row.requirement_title or row.requirement_key,
            story_ids=row.covered_by.get("user_story", []),
            criteria_ids=row.covered_by.get("acceptance_criteria", []),
            test_case_ids=row.covered_by.get("test_case", []),
            spec_endpoints=row.covered_by.get("api_endpoint", []),
            coverage_score=round(row.score * 100.0, 1),
        )
        for row in matrix.coverage
    ]
    coverage_score = (
        round((matrix.requirements_covered / matrix.requirements_total) * 100.0, 1)
        if matrix.requirements_total
        else 0.0
    )
    orphaned_reqs = [gap.key for gap in matrix.gaps if gap.type == "orphaned_requirement" and gap.key]
    speculative_stories = [gap.key for gap in matrix.gaps if gap.type == "speculative_story" and gap.key]

    return TraceabilityMatrixResponse(
        project_id=project_id,
        computed_at=datetime.now(UTC),
        latest_version_numbers=version_numbers,
        links=links,
        coverage_score=coverage_score,
        orphaned_requirements=orphaned_reqs,
        speculative_stories=speculative_stories,
        **matrix.model_dump(),
    )
