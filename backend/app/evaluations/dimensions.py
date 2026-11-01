"""Deterministic rubric dimensions. Pure scoring logic — no DB, no LLM.

Weights and thresholds are module constants so tests can pin exact maths:
- completeness: average per-requirement coverage score (story 0.5 / tests 0.3 / criteria 0.2)
- groundedness: fraction of generated claims sufficiently similar to source requirement text
- consistency: 1.0 minus penalties for referential/definitional violations, floored at 0.0
- overall: 0.35 * completeness + 0.40 * groundedness + 0.25 * consistency
"""
from __future__ import annotations

import re
from typing import Any

from app.schemas import TraceabilityMatrix

COMPLETENESS_WEIGHT = 0.35
GROUNDEDNESS_WEIGHT = 0.40
CONSISTENCY_WEIGHT = 0.25

GROUNDING_THRESHOLD = 0.70      # claim similarity >= this => grounded
HALLUCINATION_THRESHOLD = 0.45  # claim similarity < this => hallucination flag

CONSISTENCY_PENALTY = 0.25

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> set[str]:
    """Lowercase word-digit tokens; very short tokens are dropped."""
    return {tok for tok in _TOKEN_RE.findall(text.lower()) if len(tok) > 2}


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or not left:
        return 0.0
    numerator = sum(a * b for a, b in zip(left, right))
    left_norm = sum(v * v for v in left) ** 0.5
    right_norm = sum(v * v for v in right) ** 0.5
    return numerator / (left_norm * right_norm) if left_norm and right_norm else 0.0


def jaccard_similarity(left: str, right: str) -> float:
    """Lexical fallback for grounding when embeddings are unavailable."""
    left_tokens, right_tokens = tokenize(left), tokenize(right)
    if not left_tokens or not right_tokens:
        return 0.0
    intersection = len(left_tokens & right_tokens)
    return intersection / len(left_tokens | right_tokens)


def completeness_score(matrix: TraceabilityMatrix) -> dict[str, Any]:
    """Fraction of source requirements covered by generated artifacts.

    Per requirement: story coverage 0.5, test coverage 0.3, criteria coverage 0.2.
    Returns the population average plus the per-requirement breakdown.
    """
    scores = {item.requirement_key: item.score for item in matrix.coverage}
    if not scores:
        return {"score": 0.0, "breakdown": scores}
    return {"score": sum(scores.values()) / len(scores), "breakdown": scores}


def claim_texts_from_artifacts(versioned_artifacts: list[dict]) -> list[dict[str, str]]:
    """Extract checkable claim texts from artifact payloads.

    Returns [{origin_key, artifact_type, text}].
    """
    claims: list[dict[str, str]] = []
    for entry in versioned_artifacts:
        artifact_type = str(entry.get("artifact_type"))
        payload = entry.get("payload") or {}

        if artifact_type == "user_stories":
            for story in payload.get("stories") or []:
                if not isinstance(story, dict) or not story.get("story_key"):
                    continue
                text = " ".join(
                    str(part or "")
                    for part in (story.get("title"), story.get("as_a"), story.get("i_want"), story.get("so_that"))
                ).strip()
                if text:
                    claims.append({
                        "origin_key": str(story["story_key"]),
                        "artifact_type": artifact_type,
                        "text": text,
                    })

        elif artifact_type == "acceptance_criteria":
            for criteria in payload.get("acceptance_criteria") or []:
                if not isinstance(criteria, dict) or not criteria.get("criteria_key"):
                    continue
                text = " ".join(
                    str(part or "")
                    for part in (criteria.get("given"), criteria.get("when"), criteria.get("then"))
                ).strip()
                if text:
                    claims.append({
                        "origin_key": str(criteria["criteria_key"]),
                        "artifact_type": artifact_type,
                        "text": text,
                    })

        elif artifact_type == "test_cases":
            for test in payload.get("test_cases") or []:
                if not isinstance(test, dict) or not test.get("test_key"):
                    continue
                parts = [str(test.get("title") or "")]
                steps = test.get("steps")
                if isinstance(steps, list):
                    parts.extend(str(step) for step in steps)
                elif isinstance(steps, str):
                    parts.append(steps)
                parts.append(str(test.get("expected_result") or ""))
                text = " ".join(part for part in parts if part).strip()
                if text:
                    claims.append({
                        "origin_key": str(test["test_key"]),
                        "artifact_type": artifact_type,
                        "text": text,
                    })

    return claims


def groundedness_from_vectors(
    claims: list[dict[str, str]],
    source_texts: list[str],
    claim_vectors: list[list[float]],
    source_vectors: list[list[float]],
    grounded_threshold: float = GROUNDING_THRESHOLD,
    hallucination_threshold: float = HALLUCINATION_THRESHOLD,
) -> dict[str, Any]:
    """Embedding-based grounding check over pre-computed vectors."""
    results: list[dict[str, Any]] = []
    for claim, claim_vector in zip(claims, claim_vectors):
        best_similarity = 0.0
        best_index: int | None = None
        for index, source_vector in enumerate(source_vectors):
            similarity = cosine_similarity(claim_vector, source_vector)
            if similarity > best_similarity:
                best_similarity = similarity
                best_index = index
        results.append({
            "origin_key": claim["origin_key"],
            "artifact_type": claim["artifact_type"],
            "similarity": round(best_similarity, 4),
            "best_match_index": best_index,
            "grounded": best_similarity >= grounded_threshold,
            "hallucination": best_similarity < hallucination_threshold,
        })
    return _summarize_grounding(results, method="embedding")


def groundedness_from_lexical(
    claims: list[dict[str, str]],
    source_texts: list[str],
    grounded_threshold: float = GROUNDING_THRESHOLD,
    hallucination_threshold: float = HALLUCINATION_THRESHOLD,
) -> dict[str, Any]:
    """Fallback grounding check via token Jaccard similarity."""
    results: list[dict[str, Any]] = []
    for claim in claims:
        best_similarity = 0.0
        best_index: int | None = None
        for index, source_text in enumerate(source_texts):
            similarity = jaccard_similarity(claim["text"], source_text)
            if similarity > best_similarity:
                best_similarity = similarity
                best_index = index
        results.append({
            "origin_key": claim["origin_key"],
            "artifact_type": claim["artifact_type"],
            "similarity": round(best_similarity, 4),
            "best_match_index": best_index,
            "grounded": best_similarity >= grounded_threshold,
            "hallucination": best_similarity < hallucination_threshold,
        })
    return _summarize_grounding(results, method="lexical_fallback")


def _summarize_grounding(results: list[dict[str, Any]], method: str) -> dict[str, Any]:
    if not results:
        return {
            "score": 1.0,
            "method": method,
            "claims": results,
            "hallucinated": [],
            "grounded_ratio": 1.0,
        }
    grounded = sum(1 for item in results if item["grounded"])
    return {
        "score": round(grounded / len(results), 4),
        "method": method,
        "claims": results,
        "hallucinated": [item for item in results if item["hallucination"]],
        "grounded_ratio": round(grounded / len(results), 4),
    }


_PATH_REFERENCE_RE = re.compile(r"\b(get|post|put|patch|delete)\s+(/\S+)", re.IGNORECASE)


def consistency_score(
    stories_payloads: list[dict],
    criteria_payloads: list[dict],
    tests_payloads: list[dict],
    spec_payload: dict | None,
) -> dict[str, Any]:
    """Referential + definitional consistency between artifact families.

    Checks:
      1. Every acceptance criterion's story_key resolves to a generated story.
      2. Every "METHOD /path" mention in criteria or test steps resolves to a
         path declared in the OpenAPI spec.
    """
    violations: list[dict[str, str]] = []

    all_stories: list[dict] = []
    for payload in stories_payloads:
        all_stories.extend(item for item in (payload.get("stories") or []) if isinstance(item, dict))
    story_keys = {str(story.get("story_key")) for story in all_stories if story.get("story_key")}

    all_criteria: list[dict] = []
    for payload in criteria_payloads:
        all_criteria.extend(item for item in (payload.get("acceptance_criteria") or []) if isinstance(item, dict))

    for criteria_row in all_criteria:
        story_key = criteria_row.get("story_key")
        if story_key and str(story_key) not in story_keys:
            violations.append({
                "type": "dangling_story_reference",
                "origin_key": str(criteria_row.get("criteria_key")),
                "detail": (
                    f"Acceptance criteria '{criteria_row.get('criteria_key')}' "
                    f"references unknown story '{story_key}'."
                ),
            })

    declared_paths: set[str] = set()
    if isinstance(spec_payload, dict) and isinstance(spec_payload.get("paths"), dict):
        declared_paths = {str(path) for path in spec_payload["paths"]}

    def _check_reference(text: str, origin_key: str, artifact_type: str) -> None:
        for match in _PATH_REFERENCE_RE.finditer(text):
            method, referenced_path = match.group(1).upper(), match.group(2)
            if declared_paths and referenced_path not in declared_paths:
                violations.append({
                    "type": "path_not_declared",
                    "origin_key": origin_key,
                    "detail": (
                        f"{artifact_type} '{origin_key}' references endpoint "
                        f"{method} {referenced_path} that is not declared in the OpenAPI spec."
                    ),
                })

    for criteria_row in all_criteria:
        text = " ".join(
            str(part or "") for part in (criteria_row.get("when"), criteria_row.get("then"))
        )
        _check_reference(text, str(criteria_row.get("criteria_key")), "acceptance_criteria")

    for payload in tests_payloads:
        for test in (payload.get("test_cases") or []):
            if not isinstance(test, dict) or not test.get("test_key"):
                continue
            parts = [str(test.get("title") or "")]
            steps = test.get("steps")
            if isinstance(steps, list):
                parts.extend(str(step) for step in steps)
            elif isinstance(steps, str):
                parts.append(steps)
            _check_reference(
                " ".join(parts), str(test["test_key"]), "test_case"
            )

    score = round(max(0.0, 1.0 - CONSISTENCY_PENALTY * len(violations)), 4)
    return {"score": score, "violations": violations}


def overall_score(completeness: float, groundedness: float, consistency: float) -> float:
    """Weighted composite rubric score (formula pinned by tests)."""
    return round(
        COMPLETENESS_WEIGHT * completeness
        + GROUNDEDNESS_WEIGHT * groundedness
        + CONSISTENCY_WEIGHT * consistency,
        4,
    )
