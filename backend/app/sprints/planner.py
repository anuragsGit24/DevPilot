"""
Engineer 3 – Fibonacci Story Estimation & Sprint Planning Engine
=================================================================

Responsibilities
----------------
1. Estimate user stories on the Fibonacci scale (1 2 3 5 8 13).
2. Validate dependencies (unknown IDs, cycle detection).
3. Topologically sort stories (deterministic tie-breaking: priority rank, then stable ID).
4. Pack sorted stories into capacity-based sprints.
5. Return per-story estimate rationale and per-sprint summary.

All algorithms are deterministic – no external calls required.
"""

from __future__ import annotations

import logging
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

FIBONACCI = [1, 2, 3, 5, 8, 13]

# Priority ordering for tie-breaking (lower index = higher priority)
PRIORITY_ORDER = {
    "must": 0,
    "critical": 0,
    "high": 1,
    "should": 1,
    "medium": 2,
    "could": 2,
    "low": 3,
    "wont": 4,
    "won't": 4,
}

DEFAULT_SPRINT_CAPACITY = 30
DEFAULT_SPRINT_DURATION_WEEKS = 2


# ---------------------------------------------------------------------------
# Input / output data classes
# ---------------------------------------------------------------------------

@dataclass
class NormalizedStory:
    """One story as accepted by the planning endpoint."""
    id: str
    title: str
    priority: str                          # must / should / could / wont / high / medium / low
    description: str = ""
    acceptance_criteria_count: int = 0     # number of AC items
    dependency_ids: list[str] = field(default_factory=list)
    risk_level: str = "medium"             # low / medium / high
    complexity: str = "medium"             # low / medium / high
    existing_estimate: int | None = None   # Fibonacci points if already estimated


@dataclass
class StoryEstimate:
    story_id: str
    estimated_points: int
    rationale: str
    confidence: str                        # high / medium / low
    assumption: str
    retained_existing: bool = False


@dataclass
class SprintPlan:
    sprint_number: int
    name: str
    story_ids: list[str]
    total_points: int
    capacity: int
    stories: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass
class PlanningResult:
    sprints: list[SprintPlan]
    backlog: list[str]                     # story IDs that did not fit
    backlog_reasons: dict[str, str]        # story_id → reason
    estimates: list[StoryEstimate]
    topo_order: list[str]                  # story IDs in dependency order
    critical_path: list[str]
    warnings: list[str]
    overflow_policy: str
    total_sprints: int = 0
    total_stories_planned: int = 0
    total_story_points: int = 0


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

class DependencyError(ValueError):
    """Raised when dependency graph has unknown IDs or cycles."""


def _validate_dependencies(stories: list[NormalizedStory]) -> None:
    """Raise DependencyError if any dep references an unknown ID or a cycle exists."""
    known_ids = {s.id for s in stories}

    # Check for unknown references
    unknown_refs: list[str] = []
    for story in stories:
        for dep_id in story.dependency_ids:
            if dep_id not in known_ids:
                unknown_refs.append(f"Story '{story.id}' depends on unknown ID '{dep_id}'")
    if unknown_refs:
        raise DependencyError("Unknown dependency IDs: " + "; ".join(unknown_refs))

    # Cycle detection via DFS (Kahn's algorithm)
    _detect_cycle(stories)


def _detect_cycle(stories: list[NormalizedStory]) -> None:
    """Kahn's topological-sort based cycle detection. Raises DependencyError with cycle info."""
    # Build reverse adjacency: dep_id → list of story_ids that depend on dep_id
    in_degree: dict[str, int] = {s.id: 0 for s in stories}
    successors: dict[str, list[str]] = {s.id: [] for s in stories}

    for story in stories:
        for dep_id in story.dependency_ids:
            successors[dep_id].append(story.id)
            in_degree[story.id] += 1

    queue: deque[str] = deque(sid for sid, deg in in_degree.items() if deg == 0)
    visited_count = 0
    while queue:
        node = queue.popleft()
        visited_count += 1
        for succ in successors[node]:
            in_degree[succ] -= 1
            if in_degree[succ] == 0:
                queue.append(succ)

    if visited_count != len(stories):
        cyclic_ids = [sid for sid, deg in in_degree.items() if deg > 0]
        raise DependencyError(
            f"Dependency cycle detected. Offending story IDs: {cyclic_ids}. "
            "Remove or reorder the cyclic dependencies."
        )


# ---------------------------------------------------------------------------
# Estimation engine
# ---------------------------------------------------------------------------

def _snap_to_fibonacci(raw: float) -> int:
    """Return the smallest Fibonacci number >= raw (capped at 13)."""
    for f in FIBONACCI:
        if raw <= f:
            return f
    return FIBONACCI[-1]


def estimate_story(story: NormalizedStory) -> StoryEstimate:
    """
    Estimate story points for a single story.

    Rules (additive base score + modifiers):
    - Base: 1 point.
    - AC count: 0–1 AC → +0; 2–3 AC → +1; 4–5 AC → +2; 6+ AC → +3.
    - Dependencies: each dep adds 0.5 (capped at +3).
    - Risk modifier: low → 0; medium → +1; high → +2.
    - Complexity: low → 0; medium → +1; high → +2.
    - Total snapped to nearest Fibonacci.
    - If existing_estimate is provided and already on Fibonacci scale → retained.
    """
    # Honour existing estimate if valid
    if story.existing_estimate is not None and story.existing_estimate in FIBONACCI:
        return StoryEstimate(
            story_id=story.id,
            estimated_points=story.existing_estimate,
            rationale=f"Retained existing estimate of {story.existing_estimate} point(s).",
            confidence="high",
            assumption="Existing estimate accepted without re-estimation.",
            retained_existing=True,
        )

    base = 1.0
    ac_count = story.acceptance_criteria_count
    if ac_count >= 6:
        ac_bonus = 3.0
    elif ac_count >= 4:
        ac_bonus = 2.0
    elif ac_count >= 2:
        ac_bonus = 1.0
    else:
        ac_bonus = 0.0

    dep_bonus = min(len(story.dependency_ids) * 0.5, 3.0)

    risk_bonus = {"high": 2.0, "medium": 1.0, "low": 0.0}.get(story.risk_level.lower(), 1.0)
    complexity_bonus = {"high": 2.0, "medium": 1.0, "low": 0.0}.get(story.complexity.lower(), 1.0)

    raw_total = base + ac_bonus + dep_bonus + risk_bonus + complexity_bonus
    points = _snap_to_fibonacci(raw_total)

    rationale_parts = [
        f"Base: 1pt",
        f"AC count={ac_count} → +{ac_bonus:.1f}pt",
        f"Dependencies={len(story.dependency_ids)} → +{dep_bonus:.1f}pt",
        f"Risk={story.risk_level} → +{risk_bonus:.1f}pt",
        f"Complexity={story.complexity} → +{complexity_bonus:.1f}pt",
        f"Raw={raw_total:.1f} → snapped to Fibonacci={points}pt",
    ]

    confidence = "high" if ac_count >= 2 else "medium"
    if story.risk_level == "high" or story.complexity == "high":
        confidence = "medium" if confidence == "high" else "low"

    assumption = (
        "Estimate derived from AC count, dependency count, risk, and complexity signals. "
        "Refine with actual team velocity data."
    )

    return StoryEstimate(
        story_id=story.id,
        estimated_points=points,
        rationale="; ".join(rationale_parts),
        confidence=confidence,
        assumption=assumption,
        retained_existing=False,
    )


# ---------------------------------------------------------------------------
# Topological sort (deterministic tie-breaking)
# ---------------------------------------------------------------------------

def _priority_rank(priority: str) -> int:
    return PRIORITY_ORDER.get(priority.lower(), 2)


def topological_sort(stories: list[NormalizedStory]) -> list[str]:
    """
    Return story IDs in topological order (dependencies first).
    Tie-breaking: lower priority rank → processed first; then alphabetical stable ID.
    """
    story_map = {s.id: s for s in stories}
    in_degree: dict[str, int] = {s.id: 0 for s in stories}
    successors: dict[str, list[str]] = {s.id: [] for s in stories}

    for story in stories:
        for dep_id in story.dependency_ids:
            successors[dep_id].append(story.id)
            in_degree[story.id] += 1

    # Initialise queue with stories that have no deps, sorted for determinism
    ready = sorted(
        [s for s in stories if in_degree[s.id] == 0],
        key=lambda s: (_priority_rank(s.priority), s.id),
    )
    queue: deque[NormalizedStory] = deque(ready)
    result: list[str] = []

    while queue:
        story = queue.popleft()
        result.append(story.id)
        newly_ready: list[NormalizedStory] = []
        for succ_id in successors[story.id]:
            in_degree[succ_id] -= 1
            if in_degree[succ_id] == 0:
                newly_ready.append(story_map[succ_id])
        # Sort newly-ready for determinism before adding to queue
        newly_ready.sort(key=lambda s: (_priority_rank(s.priority), s.id))
        queue.extend(newly_ready)

    return result


# ---------------------------------------------------------------------------
# Critical path analysis (longest dependency chain)
# ---------------------------------------------------------------------------

def _find_critical_path(
    stories: list[NormalizedStory],
    estimates: dict[str, int],
) -> list[str]:
    """
    Return the story ID sequence forming the longest-weighted dependency chain
    (critical path by total story points).
    """
    story_map = {s.id: s for s in stories}
    # dp[id] = (max_points_in_chain, path)
    memo: dict[str, tuple[int, list[str]]] = {}

    def dfs(sid: str) -> tuple[int, list[str]]:
        if sid in memo:
            return memo[sid]
        story = story_map[sid]
        pts = estimates.get(sid, 1)
        if not story.dependency_ids:
            memo[sid] = (pts, [sid])
            return memo[sid]
        best_pts = 0
        best_path: list[str] = []
        for dep_id in story.dependency_ids:
            dep_pts, dep_path = dfs(dep_id)
            if dep_pts > best_pts:
                best_pts = dep_pts
                best_path = dep_path
        total = best_pts + pts
        path = best_path + [sid]
        memo[sid] = (total, path)
        return memo[sid]

    best_total = 0
    best_path: list[str] = []
    for story in stories:
        total, path = dfs(story.id)
        if total > best_total:
            best_total = total
            best_path = path
    return best_path


# ---------------------------------------------------------------------------
# Sprint packer
# ---------------------------------------------------------------------------

def pack_sprints(
    topo_order: list[str],
    estimates: dict[str, int],          # story_id → points
    story_map: dict[str, NormalizedStory],
    capacity: int = DEFAULT_SPRINT_CAPACITY,
    duration_weeks: int = DEFAULT_SPRINT_DURATION_WEEKS,
) -> tuple[list[SprintPlan], list[str], dict[str, str]]:
    """
    Pack stories into sprints using a first-fit decreasing approach over topo order.

    Policy for oversized stories (points > capacity):
    - The story is placed alone in its own sprint with a warning.
    - It is never silently dropped.

    Returns (sprints, backlog_ids, backlog_reasons).
    """
    sprints: list[SprintPlan] = []
    backlog: list[str] = []
    backlog_reasons: dict[str, str] = {}
    current_sprint_id = 1
    current_ids: list[str] = []
    current_points = 0

    def _flush_sprint() -> None:
        nonlocal current_sprint_id, current_ids, current_points
        if not current_ids:
            return
        sp = SprintPlan(
            sprint_number=current_sprint_id,
            name=f"Sprint {current_sprint_id}",
            story_ids=list(current_ids),
            total_points=current_points,
            capacity=capacity,
            stories=[
                {
                    "id": sid,
                    "title": story_map[sid].title,
                    "points": estimates.get(sid, 0),
                    "priority": story_map[sid].priority,
                }
                for sid in current_ids
            ],
        )
        sprints.append(sp)
        current_sprint_id += 1
        current_ids = []
        current_points = 0

    for story_id in topo_order:
        pts = estimates.get(story_id, 1)
        if pts > capacity:
            # Oversized: flush current sprint, emit a single-story sprint with warning
            _flush_sprint()
            sp = SprintPlan(
                sprint_number=current_sprint_id,
                name=f"Sprint {current_sprint_id}",
                story_ids=[story_id],
                total_points=pts,
                capacity=capacity,
                stories=[{
                    "id": story_id,
                    "title": story_map[story_id].title,
                    "points": pts,
                    "priority": story_map[story_id].priority,
                }],
                warnings=[
                    f"Story '{story_id}' ({pts} pts) exceeds sprint capacity ({capacity} pts). "
                    "Placed alone in sprint; split this story if possible."
                ],
            )
            sprints.append(sp)
            current_sprint_id += 1
            continue

        if current_points + pts > capacity:
            _flush_sprint()

        current_ids.append(story_id)
        current_points += pts

    _flush_sprint()  # flush any remaining

    return sprints, backlog, backlog_reasons


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def plan_sprints(
    stories: list[NormalizedStory],
    capacity: int = DEFAULT_SPRINT_CAPACITY,
    duration_weeks: int = DEFAULT_SPRINT_DURATION_WEEKS,
) -> PlanningResult:
    """
    Full sprint planning pipeline.

    Steps
    -----
    1. Validate dependencies (unknown IDs, cycles).
    2. Estimate each story.
    3. Topologically sort.
    4. Pack into sprints.
    5. Find critical path.
    """
    # 1. Validate
    _validate_dependencies(stories)

    # 2. Estimate
    estimate_objects = [estimate_story(s) for s in stories]
    estimate_map: dict[str, int] = {e.story_id: e.estimated_points for e in estimate_objects}

    # 3. Topological sort
    topo_order = topological_sort(stories)

    # 4. Pack
    story_map = {s.id: s for s in stories}
    sprints, backlog, backlog_reasons = pack_sprints(
        topo_order, estimate_map, story_map, capacity, duration_weeks
    )

    # 5. Critical path
    critical_path = _find_critical_path(stories, estimate_map)

    warnings: list[str] = []
    if backlog:
        warnings.append(f"{len(backlog)} story/stories could not be assigned to sprints.")
    oversized = [e for e in estimate_objects if e.estimated_points > capacity]
    if oversized:
        warnings.append(
            f"{len(oversized)} story/stories exceed sprint capacity and were placed in a solo sprint."
        )

    total_planned = sum(len(sp.story_ids) for sp in sprints)
    total_points = sum(sp.total_points for sp in sprints)

    return PlanningResult(
        sprints=sprints,
        backlog=backlog,
        backlog_reasons=backlog_reasons,
        estimates=estimate_objects,
        topo_order=topo_order,
        critical_path=critical_path,
        warnings=warnings,
        overflow_policy=(
            "Stories exceeding sprint capacity are placed alone in a dedicated sprint with a warning. "
            "They are never silently dropped or duplicated. Split oversized stories to improve packing."
        ),
        total_sprints=len(sprints),
        total_stories_planned=total_planned,
        total_story_points=total_points,
    )

