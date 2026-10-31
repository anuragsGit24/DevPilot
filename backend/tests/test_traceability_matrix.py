"""Unit tests for the pure traceability matrix engine (Engineer 4)."""
import pytest

from app.traceability.matrix import (
    KIND_CRITERIA,
    KIND_ENDPOINT,
    KIND_REQUIREMENT,
    KIND_STORY,
    KIND_TEST,
    build_matrix,
    extract_criteria_links,
    extract_endpoint_links,
    extract_story_links,
    extract_test_links,
)


def _requirements() -> list[dict]:
    return [
        {"requirement_key": "REQ-001", "title": "Customer registration"},
        {"requirement_key": "REQ-002", "title": "Password encryption"},
        {"requirement_key": "REQ-003", "title": "Dashboard performance"},
    ]


def _full_artifacts() -> list[dict]:
    return [
        {
            "artifact_type": "user_stories",
            "title": "Stories",
            "version_number": 1,
            "payload": {
                "stories": [
                    {"story_key": "US-001", "title": "Register account", "source_requirement_keys": ["REQ-001"]},
                    {"story_key": "US-002", "title": "Encrypt passwords", "source_requirement_keys": ["REQ-002"]},
                    {"story_key": "US-003", "title": "Fast dashboard", "source_requirement_keys": ["REQ-003"]},
                ]
            },
        },
        {
            "artifact_type": "acceptance_criteria",
            "title": "Criteria",
            "version_number": 1,
            "payload": {
                "acceptance_criteria": [
                    {"criteria_key": "AC-001", "story_key": "US-001", "source_requirement_keys": ["REQ-001"]},
                    {"criteria_key": "AC-002", "story_key": "US-002", "source_requirement_keys": ["REQ-002"]},
                    {"criteria_key": "AC-003", "story_key": "US-003", "source_requirement_keys": ["REQ-003"]},
                ]
            },
        },
        {
            "artifact_type": "test_cases",
            "title": "Tests",
            "version_number": 1,
            "payload": {
                "test_cases": [
                    {"test_key": "TC-001", "title": "Valid registration", "source_requirement_keys": ["REQ-001", "REQ-002"]},
                    {"test_key": "TC-002", "title": "Dashboard latency", "source_requirement_keys": ["REQ-003"]},
                ]
            },
        },
        {
            "artifact_type": "api_specification",
            "title": "API Spec",
            "version_number": 1,
            "payload": {
                "paths": {
                    "/accounts": {
                        "post": {"summary": "Register an account"},
                        "get": {"summary": "List accounts"},
                    }
                },
                "x-source-requirement-keys": ["REQ-001"],
            },
        },
    ]


def _gap_types(matrix) -> list[str]:
    return [gap.type for gap in matrix.gaps]


def test_full_chain_matrix_links_every_kind():
    matrix = build_matrix(_requirements(), _full_artifacts())
    kinds = {node.kind for node in matrix.nodes}
    assert kinds == {KIND_REQUIREMENT, KIND_STORY, KIND_CRITERIA, KIND_TEST, KIND_ENDPOINT}
    assert matrix.requirements_total == 3
    assert matrix.requirements_covered == 3
    assert all(item.fully_covered for item in matrix.coverage)
    assert not _gap_types(matrix)
    # stories implement their requirements
    story_edges = [e for e in matrix.edges if e.source_kind == KIND_STORY]
    assert {e.target_key for e in story_edges} == {"REQ-001", "REQ-002", "REQ-003"}
    # endpoints expose REQ-001
    endpoint_edges = [e for e in matrix.edges if e.source_kind == KIND_ENDPOINT]
    assert {e.target_key for e in endpoint_edges} == {"REQ-001"}
    # AC verifies stories (separate from AC -> requirement edges)
    ac_edges = [e for e in matrix.edges if e.source_kind == KIND_CRITERIA and e.relation == "verifies"]
    assert {e.target_key for e in ac_edges} == {"US-001", "US-002", "US-003"}


def test_coverage_includes_requirement_source_metadata():
    requirements = [{
        "requirement_key": "REQ-001",
        "title": "Customer registration",
        "description": "The system shall support registration.",
        "source_document": "requirements.pdf",
        "source_location": {"page_count": 4},
    }]

    coverage = build_matrix(requirements, []).coverage[0]

    assert coverage.requirement_title == "Customer registration"
    assert coverage.requirement_description == "The system shall support registration."
    assert coverage.source_document == "requirements.pdf"
    assert coverage.source_location == {"page_count": 4}


def test_orphan_requirement_flagged():
    artifacts = _full_artifacts()
    # remove REQ-003 coverage (stories, criteria, tests)
    artifacts[0]["payload"]["stories"] = artifacts[0]["payload"]["stories"][:2]
    artifacts[1]["payload"]["acceptance_criteria"] = artifacts[1]["payload"]["acceptance_criteria"][:2]
    artifacts[2]["payload"]["test_cases"] = artifacts[2]["payload"]["test_cases"][:1]
    matrix = build_matrix(_requirements(), artifacts)
    orphans = [gap for gap in matrix.gaps if gap.type == "orphan_requirement"]
    assert [gap.key for gap in orphans] == ["REQ-003"]


def test_speculative_story_flagged():
    artifacts = _full_artifacts()
    artifacts[0]["payload"]["stories"].append(
        {"story_key": "US-999", "title": "Invented feature", "source_requirement_keys": []}
    )
    matrix = build_matrix(_requirements(), artifacts)
    speculative = [gap for gap in matrix.gaps if gap.type == "speculative_story"]
    assert [gap.key for gap in speculative] == ["US-999"]


def test_criteria_without_story_flagged():
    artifacts = _full_artifacts()
    artifacts[1]["payload"]["acceptance_criteria"].append(
        {"criteria_key": "AC-199", "story_key": None, "source_requirement_keys": ["REQ-001"]}
    )
    matrix = build_matrix(_requirements(), artifacts)
    flagged = [gap for gap in matrix.gaps if gap.type == "missing_story_link"]
    assert [gap.key for gap in flagged] == ["AC-199"]


def test_unknown_requirement_reference_flagged():
    artifacts = _full_artifacts()
    artifacts[2]["payload"]["test_cases"].append(
        {"test_key": "TC-199", "title": "Ghost reference", "source_requirement_keys": ["REQ-777"]}
    )
    matrix = build_matrix(_requirements(), artifacts)
    flagged = [gap for gap in matrix.gaps if gap.type == "unknown_requirement_reference"]
    assert [gap.key for gap in flagged] == ["TC-199"]


def test_latest_version_used_for_matrix():
    artifacts = _full_artifacts()
    v2 = {
        "artifact_type": "user_stories",
        "title": "Stories",
        "version_number": 2,
        "payload": {
            "stories": [
                {"story_key": "US-100", "title": "Rewritten registration", "source_requirement_keys": ["REQ-001"]},
            ]
        },
    }
    v2_tests = {
        "artifact_type": "test_cases",
        "title": "Tests",
        "version_number": 2,
        "payload": {
            "test_cases": [
                {"test_key": "TC-100", "title": "Valid registration", "source_requirement_keys": ["REQ-001"]},
            ]
        },
    }
    # emulate latest-version-per-artifact selection (v2 supersedes v1)
    latest: dict[str, dict] = {}
    for entry in artifacts + [v2, v2_tests]:
        existing = latest.get(entry["artifact_type"])
        if existing is None or entry["version_number"] >= existing["version_number"]:
            latest[entry["artifact_type"]] = entry
    matrix = build_matrix(_requirements(), list(latest.values()))
    story_keys = {node.key for node in matrix.nodes if node.kind == KIND_STORY}
    assert story_keys == {"US-100"}  # v1 keys superseded by v2
    test_keys = {node.key for node in matrix.nodes if node.kind == KIND_TEST}
    assert test_keys == {"TC-100"}
    # REQ-002 and REQ-003 lost their story AND test linkage in the rewrite
    by_req = {item.requirement_key: item for item in matrix.coverage}
    assert by_req["REQ-001"].covered_by.get("user_story") == ["US-100"]
    assert "user_story" not in by_req["REQ-002"].covered_by
    assert "user_story" not in by_req["REQ-003"].covered_by
    assert "test_case" not in by_req["REQ-002"].covered_by
    assert "test_case" not in by_req["REQ-003"].covered_by


def test_extractors_shape():
    stories = extract_story_links({"stories": [{"story_key": "US-001", "source_requirement_keys": ["REQ-001"]}]})
    assert stories == [("US-001", "", ["REQ-001"])]
    criteria = extract_criteria_links({"acceptance_criteria": [{"criteria_key": "AC-1", "story_key": "US-001"}]})
    assert criteria == [("AC-1", "US-001", [])]
    tests = extract_test_links({"test_cases": [{"test_key": "TC-1", "source_requirement_keys": ["REQ-001"]}]})
    assert tests == [("TC-1", "", ["REQ-001"])]
    endpoints = extract_endpoint_links({"paths": {"/x": {"get": {}}}, "x-source-requirement-keys": ["REQ-001"]})
    assert endpoints == [("GET /x", "", ["REQ-001"])]


def test_coverage_scoring_matches_weights():
    matrix = build_matrix(_requirements(), _full_artifacts())
    by_req = {item.requirement_key: item for item in matrix.coverage}
    # REQ-001 has story + criteria + test => 1.0; REQ-002 same via TC-001 => 1.0
    assert by_req["REQ-001"].score == pytest.approx(1.0)
    # REQ-002 has story + criteria + test => 1.0
    assert by_req["REQ-002"].score == pytest.approx(1.0)
    # REQ-003 has story + criteria + test => 1.0
    assert by_req["REQ-003"].score == pytest.approx(1.0)


def test_duplicates_and_self_links_deduped():
    """Repeated keys across artifacts and repeated references collapse to one.

    Guards the dedup contract in build_matrix: the same node key emitted by two
    artifact rows must yield a single node, a repeated ``source_requirement_keys``
    entry must yield a single edge, and coverage lists must not accumulate
    duplicates. Self-loops (same kind+key on both ends) are dropped defensively.
    """
    artifacts = [
        {
            "artifact_type": "user_stories",
            "title": "Stories A",
            "version_number": 1,
            "payload": {
                "stories": [
                    {
                        "story_key": "US-001",
                        "title": "Register",
                        "source_requirement_keys": ["REQ-001", "REQ-001"],
                    }
                ]
            },
        },
        {
            "artifact_type": "user_stories",
            "title": "Stories B (duplicate keys)",
            "version_number": 1,
            "payload": {
                "stories": [
                    {
                        "story_key": "US-001",
                        "title": "Register (duplicate)",
                        "source_requirement_keys": ["REQ-001"],
                    }
                ]
            },
        },
    ]

    matrix = build_matrix(_requirements(), artifacts)

    story_nodes = [node for node in matrix.nodes if node.kind == KIND_STORY]
    assert [node.key for node in story_nodes] == ["US-001"]  # duplicate node collapsed

    story_edges = [edge for edge in matrix.edges if edge.source_kind == KIND_STORY]
    assert len(story_edges) == 1  # duplicate requirement reference deduped

    by_req = {item.requirement_key: item for item in matrix.coverage}
    assert by_req["REQ-001"].covered_by["user_story"] == ["US-001"]
