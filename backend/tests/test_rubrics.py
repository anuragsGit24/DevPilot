"""Unit tests for the rubric scoring dimensions (Engineer 4)."""
import pytest

from app.evaluations.dimensions import (
    COMPLETENESS_WEIGHT,
    CONSISTENCY_WEIGHT,
    GROUNDEDNESS_WEIGHT,
    completeness_score,
    consistency_score,
    cosine_similarity,
    groundedness_from_lexical,
    groundedness_from_vectors,
    jaccard_similarity,
    overall_score,
)
from app.traceability.matrix import build_matrix


def _requirements() -> list[dict]:
    return [
        {"requirement_key": "REQ-001", "title": "Customer registration"},
        {"requirement_key": "REQ-002", "title": "Password encryption"},
    ]


def _stories(chunks: int) -> list[dict]:
    return [
        {
            "artifact_type": "user_stories",
            "title": "Stories",
            "version_number": 1,
            "payload": {
                "stories": [
                    {"story_key": f"US-00{index}", "title": f"Story {index}",
                     "source_requirement_keys": [f"REQ-{index:03d}"]}
                    for index in range(1, chunks + 1)
                ]
            },
        }
    ]


def test_cosine_similarity_identical_vectors():
    vector = [1.0, 2.0, 3.0]
    assert cosine_similarity(vector, vector) == pytest.approx(1.0)


def test_cosine_similarity_orthogonal_vectors():
    assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)


def test_cosine_dimension_mismatch_is_zero():
    assert cosine_similarity([1.0, 2.0], [1.0, 2.0, 3.0]) == 0.0


def test_lexical_similarity_identical_text():
    text = "The system must encrypt passwords before storing them"
    assert jaccard_similarity(text, text) == pytest.approx(1.0)


def test_lexical_similarity_unrelated_text():
    assert jaccard_similarity("encrypt passwords", "render marketing charts") == 0.0


def test_completeness_perfect_coverage():
    requirements = [
        {"requirement_key": f"REQ-{index:03d}", "title": f"Req {index}"}
        for index in range(1, 4)
    ]
    stories_payload = [
        {"artifact_type": "user_stories", "payload": {"stories": [
            {"story_key": f"US-00{index}", "source_requirement_keys": [f"REQ-{index:03d}"]}
            for index in range(1, 4)
        ]},
        "title": "Stories", "version_number": 1},
        {"artifact_type": "acceptance_criteria", "payload": {"acceptance_criteria": [
            {"criteria_key": f"AC-00{index}", "story_key": f"US-00{index}",
             "source_requirement_keys": [f"REQ-{index:03d}"]}
            for index in range(1, 4)
        ]},
        "title": "Criteria", "version_number": 1},
        {"artifact_type": "test_cases", "payload": {"test_cases": [
            {"test_key": f"TC-00{index}", "source_requirement_keys": [f"REQ-{index:03d}"]}
            for index in range(1, 4)
        ]},
        "title": "Tests", "version_number": 1},
    ]
    matrix = build_matrix(requirements, stories_payload)
    result = completeness_score(matrix)
    assert result["score"] == pytest.approx(1.0)
    for breakdown in result["breakdown"].values():
        assert breakdown == pytest.approx(1.0)


def test_completeness_partial_coverage_precision():
    """3 requirements; only REQ-001 and REQ-002 have stories; REQ-001 also has tests."""
    requirements = [
        {"requirement_key": "REQ-001", "title": "A"},
        {"requirement_key": "REQ-002", "title": "B"},
        {"requirement_key": "REQ-003", "title": "C"},
    ]
    artifacts = [
        {"artifact_type": "user_stories", "payload": {"stories": [
            {"story_key": "US-001", "source_requirement_keys": ["REQ-001"]},
            {"story_key": "US-002", "source_requirement_keys": ["REQ-002"]},
        ]}, "title": "Stories", "version_number": 1},
        {"artifact_type": "test_cases", "payload": {"test_cases": [
            {"test_key": "TC-001", "source_requirement_keys": ["REQ-001"]},
        ]}, "title": "Tests", "version_number": 1},
    ]
    matrix = build_matrix(requirements, artifacts)
    result = completeness_score(matrix)
    # REQ-001: story(0.5)+test(0.3)=0.8; REQ-002: story(0.5); REQ-003: 0.0
    breakdown = result["breakdown"]
    assert breakdown["REQ-001"] == pytest.approx(0.8)
    assert breakdown["REQ-002"] == pytest.approx(0.5)
    assert breakdown["REQ-003"] == pytest.approx(0.0)
    assert result["score"] == pytest.approx((0.8 + 0.5 + 0.0) / 3)


def test_groundedness_embedding_above_threshold():
    claim = {"origin_key": "US-001", "artifact_type": "user_stories",
             "text": "Customer registration with email and password stored encrypted"}
    source = "The system must allow customers to register with a secure email/password flow"
    direction = [1.0, 1.0, 0.0]
    result = groundedness_from_vectors([claim], [source], [direction], [direction])
    assert result["method"] == "embedding"
    assert result["score"] == pytest.approx(1.0)
    assert not result["hallucinated"]
    assert result["claims"][0]["grounded"] is True


def test_groundedness_embedding_hallucination_flag():
    claim = {"origin_key": "US-009", "artifact_type": "user_stories",
             "text": "Integrates biometric blockchain kiosk hardware"}
    source = "Password encryption and dashboard latency"
    opposite = [1.0, 0.0]
    result = groundedness_from_vectors([claim], [source], [[0.0, 1.0]], [opposite])
    assert result["score"] == 0.0
    assert len(result["hallucinated"]) == 1
    assert result["hallucinated"][0]["origin_key"] == "US-009"


def test_lexical_fallback_grounding():
    claim = {"origin_key": "US-001", "artifact_type": "user_stories",
             "text": "The system must encrypt passwords before storing them"}
    source = "The system shall encrypt passwords before storing them"
    result = groundedness_from_lexical([claim], [source])
    assert result["method"] == "lexical_fallback"
    assert result["score"] == pytest.approx(1.0)


def test_lexical_fallback_flags_invented_claim():
    claim = {"origin_key": "US-002", "artifact_type": "user_stories",
             "text": " customers can trade stock futures margin leverage"}
    source = " dashboard renders quickly under load"
    result = groundedness_from_lexical([claim], [source])
    assert result["score"] == 0.0
    assert result["hallucinated"][0]["origin_key"] == "US-002"


def test_consistency_dangling_story_reference():
    stories_payload = [{"stories": [{"story_key": "US-001"}]}]
    criteria_payload = [{"acceptance_criteria": [
        {"criteria_key": "AC-001", "story_key": "US-999", "when": "", "then": ""}
    ]}]
    result = consistency_score(stories_payload, criteria_payload, [], None)
    assert len(result["violations"]) == 1
    assert result["violations"][0]["type"] == "dangling_story_reference"
    assert result["score"] == pytest.approx(0.75)


def test_consistency_undeclared_path_reference():
    spec_payload = {"paths": {"/registered": {"post": {"summary": "Ok"}}}}
    criteria_payload = [{"acceptance_criteria": [
        {"criteria_key": "AC-001", "story_key": "US-001",
         "when": "they call GET /undeclared-resource", "then": "404"}
    ]}]
    stories_payload = [{"stories": [{"story_key": "US-001"}]}]
    result = consistency_score(stories_payload, criteria_payload, [], spec_payload)
    types = {violation["type"] for violation in result["violations"]}
    assert "path_not_declared" in types
    # one violation => penalty applied
    assert result["score"] == pytest.approx(0.75)


def test_consistency_declared_path_is_clean():
    spec_payload = {"paths": {"/accounts": {"post": {"summary": "Ok"}}}}
    criteria_payload = [{"acceptance_criteria": [
        {"criteria_key": "AC-001", "story_key": "US-001",
         "when": "client posts to POST /accounts", "then": "201"}
    ]}]
    result = consistency_score([{"stories": [{"story_key": "US-001"}]}], criteria_payload, [], spec_payload)
    assert result["violations"] == []
    assert result["score"] == pytest.approx(1.0)


def test_test_steps_checked_against_spec():
    spec_payload = {"paths": {"/x": {"post": {}}}}
    tests_payload = [{"test_cases": [
        {"test_key": "TC-001", "title": "Call DELETE /x", "steps": ["1. Send DELETE /nope"]}
    ]}]
    result = consistency_score([], [], tests_payload, spec_payload)
    assert any(v["type"] == "path_not_declared" for v in result["violations"])


def test_weighted_overall_matches_formula():
    completeness, grounding, consistency = 0.8, 0.6, 1.0
    expected = (
        COMPLETENESS_WEIGHT * completeness
        + GROUNDEDNESS_WEIGHT * grounding
        + CONSISTENCY_WEIGHT * consistency
    )
    assert overall_score(completeness, grounding, consistency) == pytest.approx(round(expected, 4))
    # weights summed to 1.0
    assert COMPLETENESS_WEIGHT + GROUNDEDNESS_WEIGHT + CONSISTENCY_WEIGHT == pytest.approx(1.0)


def test_split_stories_payload_honored():
    stories = [{"stories": [{"story_key": "US-001"}, {"story_key": "US-002"}]}]
    criteria_payload = [{"acceptance_criteria": [
        {"criteria_key": "AC-001", "story_key": "US-002", "when": "", "then": ""}
    ]}]
    result = consistency_score(stories, criteria_payload, [], None)
    assert result["violations"] == []
