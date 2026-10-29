"""
Unit tests for Fibonacci Estimation & Capacity-based Sprint Planning Engine (Engineer 3).
Tests estimation rules, DAG cycle detection, topological tie-breaking, capacity packing,
and oversized story handling.
"""

import pytest
from app.sprints.planner import (
    DEFAULT_SPRINT_CAPACITY,
    DependencyError,
    FIBONACCI,
    NormalizedStory,
    estimate_story,
    pack_sprints,
    plan_sprints,
    topological_sort,
)


def test_fibonacci_scale_adherence():
    """Verify that all estimates strictly adhere to the Fibonacci scale: [1, 2, 3, 5, 8, 13]."""
    for ac in range(0, 10):
        for risk in ["low", "medium", "high"]:
            for complexity in ["low", "medium", "high"]:
                story = NormalizedStory(
                    id="ST-1",
                    title="Test story",
                    priority="should",
                    acceptance_criteria_count=ac,
                    risk_level=risk,
                    complexity=complexity,
                )
                est = estimate_story(story)
                assert est.estimated_points in FIBONACCI


def test_retains_valid_existing_estimate():
    """If a valid Fibonacci estimate is supplied, it must be retained with explanation."""
    story = NormalizedStory(
        id="ST-RETAIN",
        title="Previously estimated story",
        priority="must",
        acceptance_criteria_count=8,
        existing_estimate=5,
    )
    est = estimate_story(story)
    assert est.estimated_points == 5
    assert est.retained_existing is True
    assert "Retained existing estimate" in est.rationale


def test_unknown_dependency_validation():
    """Referencing a non-existent story ID must raise DependencyError."""
    stories = [
        NormalizedStory(id="ST-1", title="Story 1", priority="must", dependency_ids=["NON_EXISTENT_ID"])
    ]
    with pytest.raises(DependencyError) as exc_info:
        plan_sprints(stories)
    assert "NON_EXISTENT_ID" in str(exc_info.value)
    assert "Unknown dependency" in str(exc_info.value)


def test_direct_cycle_detection():
    """Direct 2-node cycle (A -> B and B -> A) must be detected and report offending IDs."""
    stories = [
        NormalizedStory(id="A", title="Story A", priority="must", dependency_ids=["B"]),
        NormalizedStory(id="B", title="Story B", priority="must", dependency_ids=["A"]),
    ]
    with pytest.raises(DependencyError) as exc_info:
        plan_sprints(stories)
    err = str(exc_info.value)
    assert "Dependency cycle detected" in err
    assert "A" in err or "B" in err


def test_transitive_cycle_detection():
    """Transitive 3-node cycle (A -> B -> C -> A) must be detected."""
    stories = [
        NormalizedStory(id="A", title="Story A", priority="must", dependency_ids=["C"]),
        NormalizedStory(id="B", title="Story B", priority="must", dependency_ids=["A"]),
        NormalizedStory(id="C", title="Story C", priority="must", dependency_ids=["B"]),
    ]
    with pytest.raises(DependencyError) as exc_info:
        plan_sprints(stories)
    assert "Dependency cycle detected" in str(exc_info.value)


def test_deterministic_topological_order_and_tie_breaking():
    """Stories without dependencies should tie-break by priority (must > should > could), then by stable ID."""
    stories = [
        NormalizedStory(id="ST-COULD-Z", title="Z", priority="could"),
        NormalizedStory(id="ST-MUST-B", title="B", priority="must"),
        NormalizedStory(id="ST-MUST-A", title="A", priority="must"),
        NormalizedStory(id="ST-SHOULD-M", title="M", priority="should"),
        # Dependent story
        NormalizedStory(id="ST-DEP", title="Dep", priority="must", dependency_ids=["ST-MUST-B"]),
    ]

    order = topological_sort(stories)
    # MUST stories should come before SHOULD and COULD when both are unblocked
    must_a_idx = order.index("ST-MUST-A")
    must_b_idx = order.index("ST-MUST-B")
    should_idx = order.index("ST-SHOULD-M")
    could_idx = order.index("ST-COULD-Z")
    dep_idx = order.index("ST-DEP")

    # Tie-breaking for must stories: ST-MUST-A before ST-MUST-B alphabetically
    assert must_a_idx < must_b_idx
    # Must before should and could
    assert must_a_idx < should_idx
    assert should_idx < could_idx
    # Dependency must be executed after its prerequisite
    assert must_b_idx < dep_idx


def test_capacity_packing_boundaries():
    """Stories should pack into sprints up to capacity limit without silent dropping."""
    # Create 5 stories with 8 points each = 40 points total. Capacity = 20.
    stories = [
        NormalizedStory(id=f"ST-{i}", title=f"Story {i}", priority="must", existing_estimate=8)
        for i in range(1, 6)
    ]

    plan = plan_sprints(stories, capacity=20)
    # 8 + 8 = 16 in Sprint 1
    # 8 + 8 = 16 in Sprint 2
    # 8 in Sprint 3
    assert len(plan.sprints) == 3
    assert plan.sprints[0].total_points == 16
    assert plan.sprints[1].total_points == 16
    assert plan.sprints[2].total_points == 8
    assert plan.total_stories_planned == 5
    assert len(plan.backlog) == 0


def test_oversized_story_handling():
    """Stories exceeding sprint capacity must be placed alone in a sprint with an explicit warning (never lost)."""
    stories = [
        NormalizedStory(id="NORMAL-1", title="Normal 1", priority="must", existing_estimate=5),
        NormalizedStory(id="HUGE-1", title="Massive Story", priority="must", existing_estimate=13),
        NormalizedStory(id="NORMAL-2", title="Normal 2", priority="must", existing_estimate=5),
    ]

    # Capacity is 10, but HUGE-1 is 13
    plan = plan_sprints(stories, capacity=10)

    # HUGE-1 should be scheduled, not dropped
    all_scheduled = [sid for sp in plan.sprints for sid in sp.story_ids]
    assert "HUGE-1" in all_scheduled
    assert plan.total_stories_planned == 3

    # The sprint containing HUGE-1 must carry a warning
    huge_sprint = next(sp for sp in plan.sprints if "HUGE-1" in sp.story_ids)
    assert len(huge_sprint.warnings) > 0
    assert "exceeds sprint capacity" in huge_sprint.warnings[0]


def test_plan_repeatability():
    """Running plan_sprints multiple times on the same input must produce identical results."""
    stories = [
        NormalizedStory(id="ST-3", title="Story 3", priority="should", dependency_ids=["ST-1"]),
        NormalizedStory(id="ST-1", title="Story 1", priority="must"),
        NormalizedStory(id="ST-2", title="Story 2", priority="must"),
    ]

    plan_a = plan_sprints(stories, capacity=30)
    plan_b = plan_sprints(stories, capacity=30)

    assert plan_a.topo_order == plan_b.topo_order
    assert len(plan_a.sprints) == len(plan_b.sprints)
    for sp_a, sp_b in zip(plan_a.sprints, plan_b.sprints):
        assert sp_a.story_ids == sp_b.story_ids
        assert sp_a.total_points == sp_b.total_points


def test_critical_path_identification():
    """The critical path must track the longest weighted dependency chain."""
    stories = [
        NormalizedStory(id="START", title="Start", priority="must", existing_estimate=2),
        NormalizedStory(id="BRANCH_A", title="Short branch", priority="should", dependency_ids=["START"], existing_estimate=3),
        NormalizedStory(id="BRANCH_B1", title="Long branch 1", priority="should", dependency_ids=["START"], existing_estimate=5),
        NormalizedStory(id="BRANCH_B2", title="Long branch 2", priority="should", dependency_ids=["BRANCH_B1"], existing_estimate=8),
    ]

    plan = plan_sprints(stories, capacity=40)
    # Long branch total: START (2) + B1 (5) + B2 (8) = 15 pts
    # Short branch total: START (2) + A (3) = 5 pts
    assert plan.critical_path == ["START", "BRANCH_B1", "BRANCH_B2"]

