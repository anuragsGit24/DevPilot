"""Pure traceability matrix builder.

Consumes requirements and the latest artifact version payloads and derives the
full link graph with gap analysis. Every linkage available in the generated
payloads is used:

- user_stories   -> stories[].{story_key, title, source_requirement_keys}
- acceptance_criteria -> criteria[].{criteria_key, story_key, source_requirement_keys}
- test_cases     -> test_cases[].{test_key, title, source_requirement_keys}
- api_specification -> paths -> "METHOD /path" nodes + x-source-requirement-keys

No LLM involvement, fully deterministic and unit-testable.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.schemas import (
    RequirementCoverage,
    TraceabilityGap,
    TraceabilityMatrix,
    TraceEdge,
    TraceNode,
)

HTTP_METHODS = ("get", "post", "put", "patch", "delete", "options", "head")

KIND_REQUIREMENT = "requirement"
KIND_STORY = "user_story"
KIND_CRITERIA = "acceptance_criteria"
KIND_TEST = "test_case"
KIND_ENDPOINT = "api_endpoint"

# Score contribution per coverage kind (used by the completeness rubric).
COVERAGE_WEIGHTS = {KIND_STORY: 0.5, KIND_TEST: 0.3, KIND_CRITERIA: 0.2}
FULL_KINDS = (KIND_STORY, KIND_CRITERIA, KIND_TEST)

_NODE_ORDER = {KIND_REQUIREMENT: 0, KIND_STORY: 1, KIND_CRITERIA: 2, KIND_TEST: 3, KIND_ENDPOINT: 4}


def _as_str_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if isinstance(item, (str, int)) and str(item)]


def _node_sort_key(node: TraceNode) -> tuple[int, str]:
    return (_NODE_ORDER.get(node.kind, 99), node.key)


def extract_story_links(payload: dict) -> list[tuple[str, str, list[str]]]:
    """Yield (story_key, title, source_requirement_keys) tuples."""
    result = []
    for story in payload.get("stories") or []:
        if not isinstance(story, dict):
            continue
        story_key = story.get("story_key") or ""
        if not story_key:
            continue
        title = story.get("title") or ""
        result.append((str(story_key), str(title), _as_str_list(story.get("source_requirement_keys"))))
    return result


def extract_criteria_links(payload: dict) -> list[tuple[str, str | None, list[str]]]:
    """Yield (criteria_key, story_key, source_requirement_keys) tuples."""
    result = []
    for criteria in payload.get("acceptance_criteria") or []:
        if not isinstance(criteria, dict):
            continue
        criteria_key = criteria.get("criteria_key") or ""
        if not criteria_key:
            continue
        story_key = criteria.get("story_key") or None
        result.append(
            (str(criteria_key), str(story_key) if story_key else None,
             _as_str_list(criteria.get("source_requirement_keys")))
        )
    return result


def extract_test_links(payload: dict) -> list[tuple[str, str, list[str]]]:
    """Yield (test_key, title, source_requirement_keys) tuples."""
    result = []
    for test in payload.get("test_cases") or []:
        if not isinstance(test, dict):
            continue
        test_key = test.get("test_key") or ""
        if not test_key:
            continue
        title = test.get("title") or ""
        result.append((str(test_key), str(title), _as_str_list(test.get("source_requirement_keys"))))
    return result


def extract_endpoint_links(payload: dict) -> list[tuple[str, str, list[str]]]:
    """Yield (METHOD /path, summary, source_requirement_keys) tuples from an OpenAPI payload."""
    keys = _as_str_list(payload.get("x-source-requirement-keys"))
    result = []
    for path, methods in (payload.get("paths") or {}).items():
        if not isinstance(methods, dict):
            continue
        for method in HTTP_METHODS:
            if method in methods:
                operation = methods.get(method)
                summary = ""
                if isinstance(operation, dict):
                    summary = operation.get("summary") or ""
                result.append((f"{method.upper()} {path}", str(summary), keys))
    return result


def build_matrix(
    requirements: list[dict],
    versioned_artifacts: list[dict],
) -> TraceabilityMatrix:
    """
    Build the traceability matrix.

    Args:
        requirements: [{requirement_key, title}]
        versioned_artifacts: [{artifact_type, title, version_number, payload}]
            (use the LATEST version per artifact).
    """
    requirement_metadata = {
        str(req.get("requirement_key")): {
            "title": str(req.get("title") or ""),
            "description": str(req.get("description") or ""),
            "source_document": req.get("source_document"),
            "source_location": req.get("source_location"),
        }
        for req in requirements
        if req.get("requirement_key")
    }
    requirement_titles = {key: metadata["title"] for key, metadata in requirement_metadata.items()}
    nodes: list[TraceNode] = []
    edges: list[TraceEdge] = []
    gaps: list[TraceabilityGap] = []
    # requirement_key -> kind -> [source.artifact keys]
    coverage: dict[str, dict[str, list[str]]] = {
        key: {} for key in requirement_titles
    }

    for req_key, title in sorted(requirement_titles.items()):
        nodes.append(TraceNode(kind=KIND_REQUIREMENT, key=req_key, title=title))

    def _register(kind: str, source_key: str, req_keys: list[str], origin_key: str) -> None:
        for req_key in req_keys:
            if req_key not in requirement_titles:
                gaps.append(
                    TraceabilityGap(
                        type="unknown_requirement_reference",
                        kind=kind,
                        key=origin_key,
                        detail=(f"{origin_key} references unknown requirement '{req_key}'."),
                    )
                )
                continue
            edges.append(TraceEdge(source_kind=kind, source_key=source_key,
                                   target_kind=KIND_REQUIREMENT, target_key=req_key,
                                   relation=relation_for_kind(kind)))
            coverage[req_key].setdefault(kind, []).append(source_key)

    for entry in versioned_artifacts:
        artifact_type = str(entry.get("artifact_type"))
        payload = entry.get("payload") or {}

        if artifact_type == "user_stories":
            for story_key, title, req_keys in extract_story_links(payload):
                nodes.append(TraceNode(kind=KIND_STORY, key=story_key, title=title))
                if not [key for key in req_keys if key in requirement_titles]:
                    gaps.append(TraceabilityGap(
                        type="speculative_story", kind=KIND_STORY, key=story_key,
                        detail=f"Story '{story_key}' has no valid source requirement link.",
                    ))
                _register(KIND_STORY, story_key, req_keys, story_key)

        elif artifact_type == "acceptance_criteria":
            for criteria_key, story_key, req_keys in extract_criteria_links(payload):
                nodes.append(TraceNode(kind=KIND_CRITERIA, key=criteria_key))
                if story_key:
                    edges.append(TraceEdge(source_kind=KIND_CRITERIA, source_key=criteria_key,
                                           target_kind=KIND_STORY, target_key=story_key,
                                           relation="verifies"))
                else:
                    gaps.append(TraceabilityGap(
                        type="missing_story_link", kind=KIND_CRITERIA, key=criteria_key,
                        detail=f"Acceptance criteria '{criteria_key}' has no linked story.",
                    ))
                _register(KIND_CRITERIA, criteria_key, req_keys, criteria_key)

        elif artifact_type == "test_cases":
            for test_key, _title, req_keys in extract_test_links(payload):
                nodes.append(TraceNode(kind=KIND_TEST, key=test_key, title=_title))
                if not [key for key in req_keys if key in requirement_titles]:
                    gaps.append(TraceabilityGap(
                        type="missing_requirement_coverage", kind=KIND_TEST, key=test_key,
                        detail=f"Test case '{test_key}' has no valid source requirement link.",
                    ))
                _register(KIND_TEST, test_key, req_keys, test_key)

        elif artifact_type == "api_specification":
            for endpoint_key, summary, req_keys in extract_endpoint_links(payload):
                nodes.append(TraceNode(kind=KIND_ENDPOINT, key=endpoint_key, title=summary))
                _register(KIND_ENDPOINT, endpoint_key, req_keys, endpoint_key)

    # Gap analysis: orphan requirements (asked for, but nothing generated)
    for req_key in sorted(coverage):
        if not [kind for kind in FULL_KINDS if coverage[req_key].get(kind)]:
            gaps.append(TraceabilityGap(
                type="orphan_requirement", kind=KIND_REQUIREMENT, key=req_key,
                detail=f"Requirement '{req_key}' has no covering story, criteria, or tests.",
            ))

    coverage_list = [
        RequirementCoverage(
            requirement_key=req_key,
            requirement_title=requirement_metadata[req_key]["title"] or None,
            requirement_description=requirement_metadata[req_key]["description"] or None,
            source_document=requirement_metadata[req_key]["source_document"],
            source_location=requirement_metadata[req_key]["source_location"],
            covered_by={kind: keys for kind, keys in coverage[req_key].items()},
            fully_covered=all(coverage[req_key].get(kind) for kind in FULL_KINDS),
            score=_coverage_score(coverage[req_key]),
        )
        for req_key in sorted(coverage)
    ]

    nodes.sort(key=_node_sort_key)
    return TraceabilityMatrix(
        nodes=nodes,
        edges=edges,
        coverage=coverage_list,
        gaps=gaps,
        requirements_total=len(requirement_titles),
        requirements_covered=sum(1 for item in coverage_list if item.fully_covered),
    )


def relation_for_kind(kind: str) -> str:
    return {
        KIND_STORY: "implements",
        KIND_CRITERIA: "specified_by",
        KIND_TEST: "tested_by",
        KIND_ENDPOINT: "exposed_by",
    }.get(kind, "relates_to")


def _coverage_score(kinds: dict[str, list[str]]) -> float:
    return round(min(1.0, sum(COVERAGE_WEIGHTS.get(kind, 0.0) for kind, keys in kinds.items() if keys)), 2)


def matrix_from_artifact_rows(
    requirements: list[Any],
    artifact_versions: list[Any],
    computed_at: datetime | None = None,
) -> tuple[TraceabilityMatrix, dict[str, int]]:
    """
    Convenience adapter: from SQLAlchemy ORM rows to dicts (Engineer 3's
    project serialized rows) and builds the matrix. Version lines dedupe to latest.
    """
    computed_at = computed_at or datetime.now(UTC)
    picks: dict[str, dict] = {}
    for version in sorted(artifact_versions, key=lambda v: v.version_number):
        artifact = version.artifact
        artifact_type = artifact.artifact_type.value if hasattr(artifact.artifact_type, "value") else str(artifact.artifact_type)
        picks[artifact.id] = {
            "artifact_id": str(artifact.id),
            "artifact_type": artifact_type,
            "title": artifact.title,
            "version_number": version.version_number,
            "payload": version.payload if isinstance(version.payload, dict) else {},
        }
    requirement_dicts = [
        {
            "requirement_key": requirement.requirement_key,
            "title": requirement.title,
            "description": requirement.description,
            "source_document": requirement.source_document,
            "source_location": requirement.source_location,
        }
        for requirement in requirements
    ]
    matrix = build_matrix(requirement_dicts, list(picks.values()))
    version_numbers = {
        entry["artifact_id"]: entry["version_number"] for entry in picks.values()
    }
    return matrix, version_numbers
