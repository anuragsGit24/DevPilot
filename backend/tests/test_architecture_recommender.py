"""
Unit tests for Architecture Recommendation Engine (Engineer 3).
Tests deterministic signal detection, pattern selection, component synthesis,
security/resilience rules, ADR generation, and provider labeling.
"""

import pytest
from app.architecture.recommender import (
    generate_architecture_recommendation,
    _choose_pattern,
    _score_signals,
    ArchitectureRecommendationResult,
)


def test_signal_scoring_keywords():
    """Verify keyword scoring logic across scale, security, realtime, and team signals."""
    reqs = [
        {"title": "High throughput payment gateway", "description": "Needs to support millions of users globally."},
        {"title": "Strict GDPR compliance", "description": "End to end encryption and zero trust audit logging."},
    ]
    extra_context = "Solo developer working on a simple prototype."
    scores = _score_signals(reqs, extra_context)

    assert scores["high_scale"] >= 2  # millions, global
    assert scores["security"] >= 2    # gdpr, encryption, zero trust, audit
    assert scores["small_team"] >= 1  # solo developer


def test_pattern_selection_microservices():
    """High scale signals + security requirements should lead to Microservices pattern."""
    scores = {"high_scale": 3, "security": 2, "realtime": 0, "small_team": 0, "integration": 0}
    pattern, evidence = _choose_pattern(scores)
    assert pattern == "Microservices"
    assert len(evidence) > 0


def test_pattern_selection_event_driven():
    """High scale + realtime signals should lead to Event-Driven Microservices."""
    scores = {"high_scale": 1, "security": 0, "realtime": 2, "small_team": 0, "integration": 0}
    pattern, evidence = _choose_pattern(scores)
    assert pattern == "Event-Driven Microservices"


def test_pattern_selection_modular_monolith_default():
    """Standard project without massive scale signals defaults to Modular Monolith."""
    scores = {"high_scale": 0, "security": 0, "realtime": 0, "small_team": 0, "integration": 0}
    pattern, evidence = _choose_pattern(scores)
    assert pattern == "Modular Monolith"


def test_pattern_selection_small_team():
    """Explicit small team signal favors Modular Monolith."""
    scores = {"high_scale": 0, "security": 0, "realtime": 0, "small_team": 1, "integration": 0}
    pattern, evidence = _choose_pattern(scores)
    assert pattern == "Modular Monolith"
    assert "Small-team" in evidence[0]


def test_recommendation_structure_and_provider_fallback():
    """When LLM is unavailable, provider must be 'rules_based' (never labeled LLM)."""
    reqs = [
        {"title": "User Accounts", "description": "Basic user signup and profile management.", "category": "functional", "priority": "must"}
    ]
    result = generate_architecture_recommendation(
        requirements=reqs,
        extra_context="Retail banking prototype",
        llm_response=None,
    )

    assert isinstance(result, ArchitectureRecommendationResult)
    assert result.provider == "rules_based"
    assert result.pattern in ["Modular Monolith", "Microservices", "Event-Driven Microservices", "API-First Modular Monolith"]
    assert len(result.components) >= 3
    assert len(result.data_stores) >= 1
    assert len(result.security_patterns) >= 1
    assert len(result.resilience_patterns) >= 1
    assert len(result.alternatives) >= 1
    assert len(result.adrs) >= 1
    assert len(result.risks) >= 1
    assert len(result.assumptions) >= 1
    assert result.mermaid_diagram is not None
    assert "flowchart" in result.mermaid_diagram


def test_llm_response_parsing_success():
    """When a valid LLM response JSON is provided, provider must be 'llm'."""
    mock_llm_json = """{
        "pattern": "Microservices",
        "summary": "AI tailored high-scale architecture",
        "components": [
            {"name": "Auth Gateway", "role": "Edge Proxy", "technology": "Envoy", "responsibilities": ["Auth", "Rate limiting"]}
        ],
        "data_stores": [{"type": "Relational", "technology": "CockroachDB", "rationale": "Global consistency"}],
        "security_patterns": ["mTLS", "JWT"],
        "resilience_patterns": ["Circuit Breaker"],
        "deployment_topology": "GKE multi-region",
        "alternatives": [{"name": "Monolith", "rationale": "Simpler", "tradeoffs": "Scalability"}],
        "adrs": [{"id": "ADR-001", "title": "Envoy Gateway", "context": "Routing", "decision": "Envoy", "consequences": "Config complexity"}],
        "risks": ["Cluster complexity"],
        "assumptions": ["Kubernetes expertise available"],
        "rationale": "High scale banking needs distributed architecture",
        "evidence": ["100k TPS requirement"]
    }"""

    result = generate_architecture_recommendation(
        requirements=[],
        extra_context="",
        llm_response=mock_llm_json,
    )

    assert result.provider == "llm"
    assert result.pattern == "Microservices"
    assert result.summary == "AI tailored high-scale architecture"
    assert len(result.components) == 1
    assert result.components[0].name == "Auth Gateway"

