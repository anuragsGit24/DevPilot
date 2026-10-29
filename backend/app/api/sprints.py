"""
Sprint Planning and Backlog Scheduling API Router.

Provides endpoints for dependency-aware topological sequencing, Fibonacci story
point estimation, capacity-based sprint packing, and sprint lifecycle retrieval.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, get_client_ip, verify_project_access
from app.core.audit import record_audit_log
from app.models import WorkItem
from app.sprints.planner import (
    DEFAULT_SPRINT_CAPACITY,
    DEFAULT_SPRINT_DURATION_WEEKS,
    DependencyError,
    NormalizedStory,
    plan_sprints,
)

router = APIRouter(prefix="/projects/{project_id}/sprints", tags=["sprints"])


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────────────────────────────────────

class NormalizedStoryIn(BaseModel):
    """
    Standardized user story representation for estimation and dependency scheduling.
    Allows synthetic or ad-hoc story sets to be planned directly via API.
    """
    id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=300)
    priority: str = Field(default="should", max_length=20)
    description: str = Field(default="", max_length=2000)
    acceptance_criteria_count: int = Field(default=0, ge=0, le=100)
    dependency_ids: list[str] = Field(default_factory=list)
    risk_level: str = Field(default="medium", max_length=20)
    complexity: str = Field(default="medium", max_length=20)
    existing_estimate: int | None = Field(
        default=None,
        description="Fibonacci points (1, 2, 3, 5, 8, 13) if previously confirmed.",
    )


class SprintPlanRequest(BaseModel):
    """
    Request parameters for generating a sprint schedule.
    If ``stories`` is provided, it takes precedence over persisted stories in the DB.
    """
    stories: list[NormalizedStoryIn] = Field(
        default_factory=list,
        description="Explicit normalized stories. If empty, project work items of record_type 'user_story' are used.",
    )
    capacity_story_points: int = Field(
        default=DEFAULT_SPRINT_CAPACITY,
        ge=1,
        le=500,
        description="Target story-point velocity per sprint.",
    )
    sprint_duration_weeks: int = Field(
        default=DEFAULT_SPRINT_DURATION_WEEKS,
        ge=1,
        le=8,
        description="Sprint cycle length in weeks.",
    )
    start_date: str | None = Field(
        default=None,
        description="ISO date string for start of Sprint 1 (e.g. '2026-11-01'). Defaults to today.",
    )


class StoryEstimateOut(BaseModel):
    story_id: str
    estimated_points: int
    rationale: str
    confidence: str
    assumption: str
    retained_existing: bool


class SprintOut(BaseModel):
    id: str
    project_id: str
    sprint_number: int
    name: str
    goal: str
    start_date: str
    end_date: str
    status: str
    story_ids: list[str]
    total_points: int
    capacity: int
    warnings: list[str] = Field(default_factory=list)
    stories: list[dict[str, Any]] = Field(default_factory=list)
    created_at: str
    updated_at: str


class SprintPlanResponse(BaseModel):
    """Comprehensive plan detailing sprint allocations, estimates, and critical paths."""
    sprints: list[SprintOut]
    backlog: list[str]
    backlog_reasons: dict[str, str]
    estimates: list[StoryEstimateOut]
    topo_order: list[str]
    critical_path: list[str]
    warnings: list[str]
    overflow_policy: str
    total_sprints: int
    total_stories_planned: int
    total_story_points: int


# ──────────────────────────────────────────────────────────────────────────────
# Helper Utilities
# ──────────────────────────────────────────────────────────────────────────────

def _compute_dates(sprint_number: int, duration_weeks: int, base_date: datetime) -> tuple[str, str]:
    start = base_date + timedelta(weeks=duration_weeks * (sprint_number - 1))
    end = start + timedelta(weeks=duration_weeks) - timedelta(days=1)
    return start.date().isoformat(), end.date().isoformat()


def _work_item_to_sprint_out(item: WorkItem) -> SprintOut:
    p = item.payload or {}
    return SprintOut(
        id=str(item.id),
        project_id=str(item.project_id),
        sprint_number=int(p.get("sprint_number", 1)),
        name=item.title,
        goal=p.get("goal", ""),
        start_date=p.get("startDate", p.get("start_date", "")),
        end_date=p.get("endDate", p.get("end_date", "")),
        status=item.status or "planning",
        story_ids=list(p.get("userStoryIds", p.get("story_ids", []))),
        total_points=int(p.get("totalPoints", p.get("total_points", 0))),
        capacity=int(p.get("capacityStoryPoints", p.get("capacity", 0))),
        warnings=list(p.get("warnings", [])),
        stories=list(p.get("stories", [])),
        created_at=item.created_at.isoformat() if item.created_at else "",
        updated_at=item.updated_at.isoformat() if item.updated_at else "",
    )


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post(
    "/plan",
    response_model=SprintPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate dependency-aware, capacity-based sprint plan",
    description=(
        "Performs Fibonacci story point estimation, verifies DAG dependency validity, "
        "topologically sequences stories, and packs them into capacity-constrained sprints. "
        "Persists the resulting plan as sprint work items, replacing any previous sprint plan."
    ),
)
async def plan_sprints_endpoint(
    request: Request,
    project_id: uuid.UUID,
    payload: SprintPlanRequest,
    current_user: CurrentUser,
    session: DbSession,
) -> SprintPlanResponse:
    await verify_project_access(project_id, current_user, session, "sprints:manage")

    stories: list[NormalizedStory] = []

    if payload.stories:
        for s in payload.stories:
            stories.append(
                NormalizedStory(
                    id=s.id,
                    title=s.title,
                    priority=s.priority,
                    description=s.description,
                    acceptance_criteria_count=s.acceptance_criteria_count,
                    dependency_ids=s.dependency_ids,
                    risk_level=s.risk_level,
                    complexity=s.complexity,
                    existing_estimate=s.existing_estimate,
                )
            )
    else:
        # Load from persisted project user_story work items
        result = await session.execute(
            select(WorkItem).where(
                WorkItem.project_id == project_id,
                WorkItem.record_type == "user_story",
            )
        )
        db_stories = result.scalars().all()
        for item in db_stories:
            p = item.payload or {}
            stories.append(
                NormalizedStory(
                    id=str(p.get("id", item.id)),
                    title=item.title,
                    priority=str(p.get("priority", "should")),
                    description=str(p.get("description", "")),
                    acceptance_criteria_count=int(p.get("acceptance_criteria_count", len(p.get("acceptanceCriteria", [])))),
                    dependency_ids=[str(d) for d in p.get("dependency_ids", p.get("dependencyIds", []))],
                    risk_level=str(p.get("risk_level", "medium")),
                    complexity=str(p.get("complexity", "medium")),
                    existing_estimate=(
                        int(p["storyPoints"]) if p.get("storyPoints") and int(p["storyPoints"]) > 0 else None
                    ),
                )
            )

    if not stories:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No user stories available to plan. Provide 'stories' in request or ingest user stories first.",
        )

    # Execute deterministic planning engine
    try:
        plan = plan_sprints(
            stories=stories,
            capacity=payload.capacity_story_points,
            duration_weeks=payload.sprint_duration_weeks,
        )
    except DependencyError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    # Determine start date
    try:
        base_dt = datetime.fromisoformat(payload.start_date) if payload.start_date else datetime.now(timezone.utc)
    except ValueError:
        base_dt = datetime.now(timezone.utc)

    # Safe persistence: purge prior auto-planned sprint records for this project before saving new plan
    # Explicitly protect and preserve manual sprints and non-planner work items
    existing_sprints_result = await session.execute(
        select(WorkItem).where(
            WorkItem.project_id == project_id,
            WorkItem.record_type == "sprint",
        )
    )
    for old_sprint in existing_sprints_result.scalars().all():
        p = old_sprint.payload or {}
        if p.get("source") == "manual" or p.get("is_manual") is True:
            # Preserve manual sprint
            continue
        await session.delete(old_sprint)
    await session.flush()

    sprint_items: list[WorkItem] = []
    for sp in plan.sprints:
        start_date, end_date = _compute_dates(sp.sprint_number, payload.sprint_duration_weeks, base_dt)
        sprint_payload: dict[str, Any] = {
            "source": "auto_planner",
            "is_auto_planned": True,
            "sprint_number": sp.sprint_number,
            "goal": f"Sprint {sp.sprint_number}: deliver {len(sp.story_ids)} user story/stories ({sp.total_points} pts)",
            "startDate": start_date,
            "start_date": start_date,
            "endDate": end_date,
            "end_date": end_date,
            "userStoryIds": sp.story_ids,
            "story_ids": sp.story_ids,
            "totalPoints": sp.total_points,
            "total_points": sp.total_points,
            "capacityStoryPoints": sp.capacity,
            "capacity": sp.capacity,
            "allocatedStoryPoints": sp.total_points,
            "targetVelocity": sp.capacity,
            "completedPoints": 0,
            "warnings": sp.warnings,
            "stories": sp.stories,
        }
        item = WorkItem(
            project_id=project_id,
            record_type="sprint",
            title=sp.name,
            status="planning",
            payload=sprint_payload,
            source_ids=[],
            created_by=current_user.id,
        )
        session.add(item)
        await session.flush()
        sprint_items.append(item)

    await record_audit_log(
        session=session,
        action="SPRINTS_PLANNED",
        user_id=current_user.id,
        entity_type="sprint",
        entity_id=str(project_id),
        entity_title=f"Sprint Plan ({len(plan.sprints)} sprints)",
        ip_address=get_client_ip(request),
        details={
            "project_id": str(project_id),
            "sprints": len(plan.sprints),
            "stories_count": len(stories),
            "capacity": payload.capacity_story_points,
        },
    )
    await session.commit()
    for item in sprint_items:
        await session.refresh(item)

    sprints_out = [_work_item_to_sprint_out(wi) for wi in sprint_items]
    estimates_out = [
        StoryEstimateOut(
            story_id=e.story_id,
            estimated_points=e.estimated_points,
            rationale=e.rationale,
            confidence=e.confidence,
            assumption=e.assumption,
            retained_existing=e.retained_existing,
        )
        for e in plan.estimates
    ]

    total_pts = sum(sp.total_points for sp in plan.sprints)

    return SprintPlanResponse(
        sprints=sprints_out,
        backlog=plan.backlog,
        backlog_reasons=plan.backlog_reasons,
        estimates=estimates_out,
        topo_order=plan.topo_order,
        critical_path=plan.critical_path,
        warnings=plan.warnings,
        overflow_policy=plan.overflow_policy,
        total_sprints=len(plan.sprints),
        total_stories_planned=len(stories) - len(plan.backlog),
        total_story_points=total_pts,
    )


@router.get(
    "",
    response_model=list[SprintOut],
    summary="List all planned sprints for project",
    description="Returns all persisted sprint plans and their story assignments for the project.",
)
async def list_sprints(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> list[SprintOut]:
    await verify_project_access(project_id, current_user, session, "sprints:view")

    result = await session.execute(
        select(WorkItem)
        .where(
            WorkItem.project_id == project_id,
            WorkItem.record_type == "sprint",
        )
        .order_by(WorkItem.created_at.asc())
    )
    items = result.scalars().all()
    return [_work_item_to_sprint_out(item) for item in items]
