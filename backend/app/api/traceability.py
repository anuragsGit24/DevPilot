"""Traceability Matrix API Router.

Bi-directional linking between PRD Requirements, User Stories,
Acceptance Criteria, Test Cases, and OpenAPI Endpoints.
"""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, verify_project_access
from app.models import Artifact, ArtifactVersion, Requirement, WorkItem

router = APIRouter(prefix="/projects/{project_id}/traceability", tags=["traceability"])


class TraceabilityLink(BaseModel):
    requirement_id: str
    requirement_title: str
    story_ids: list[str] = Field(default_factory=list)
    criteria_ids: list[str] = Field(default_factory=list)
    test_case_ids: list[str] = Field(default_factory=list)
    spec_endpoints: list[str] = Field(default_factory=list)
    coverage_score: float = 0.0


class TraceabilityMatrixResponse(BaseModel):
    links: list[TraceabilityLink] = Field(default_factory=list)
    orphaned_requirements: list[str] = Field(default_factory=list)
    speculative_stories: list[str] = Field(default_factory=list)
    coverage_score: float = 0.0
    total_requirements: int = 0
    covered_requirements: int = 0


@router.get("/matrix", response_model=TraceabilityMatrixResponse)
async def get_traceability_matrix(
    request: Request,
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> TraceabilityMatrixResponse:
    """Calculate and return bi-directional traceability graph and gap analysis."""
    await verify_project_access(project_id, current_user, session, "artifacts:view")

    # 1. Fetch requirements
    req_stmt = (
        select(Requirement)
        .where(Requirement.project_id == project_id)
        .order_by(Requirement.requirement_key.asc())
    )
    req_res = await session.execute(req_stmt)
    requirements = req_res.scalars().all()

    # Fallback to work items if requirements table is empty
    wi_req_stmt = select(WorkItem).where(
        WorkItem.project_id == project_id, WorkItem.record_type == "requirement"
    )
    wi_req_res = await session.execute(wi_req_stmt)
    wi_requirements = wi_req_res.scalars().all()

    # 2. Fetch all user stories
    all_stories: list[dict[str, Any]] = []
    art_story_stmt = select(Artifact).where(
        Artifact.project_id == project_id, Artifact.artifact_type == "user_stories"
    )
    art_story_res = await session.execute(art_story_stmt)
    for art in art_story_res.scalars().all():
        ver_stmt = (
            select(ArtifactVersion)
            .where(ArtifactVersion.artifact_id == art.id)
            .order_by(ArtifactVersion.version_number.desc())
            .limit(1)
        )
        ver_res = await session.execute(ver_stmt)
        ver = ver_res.scalar_one_or_none()
        if ver and isinstance(ver.payload, dict):
            all_stories.extend(ver.payload.get("stories", []))

    wi_story_stmt = select(WorkItem).where(
        WorkItem.project_id == project_id, WorkItem.record_type == "user_story"
    )
    wi_story_res = await session.execute(wi_story_stmt)
    for wi in wi_story_res.scalars().all():
        p = wi.payload or {}
        all_stories.append({
            "id": p.get("id", str(wi.id)),
            "title": wi.title or p.get("title", ""),
            "source_requirement_ids": p.get("source_requirement_ids") or p.get("sourceRequirementIds") or [],
        })

    # 3. Fetch acceptance criteria
    all_criteria: list[dict[str, Any]] = []
    wi_ac_stmt = select(WorkItem).where(
        WorkItem.project_id == project_id, WorkItem.record_type == "acceptance_criteria"
    )
    wi_ac_res = await session.execute(wi_ac_stmt)
    for wi in wi_ac_res.scalars().all():
        p = wi.payload or {}
        all_criteria.append({
            "id": p.get("id", str(wi.id)),
            "story_id": p.get("storyId") or p.get("user_story_id") or p.get("userStoryId"),
            "source_requirement_ids": p.get("source_requirement_ids") or p.get("sourceRequirementIds") or [],
        })

    # 4. Fetch test cases
    all_tests: list[dict[str, Any]] = []
    wi_tc_stmt = select(WorkItem).where(
        WorkItem.project_id == project_id, WorkItem.record_type == "test_case"
    )
    wi_tc_res = await session.execute(wi_tc_stmt)
    for wi in wi_tc_res.scalars().all():
        p = wi.payload or {}
        all_tests.append({
            "id": p.get("id", str(wi.id)),
            "criteria_id": p.get("criteriaId") or p.get("criteria_id"),
            "story_id": p.get("storyId") or p.get("userStoryId"),
        })

    # 5. Fetch API endpoints
    all_endpoints: list[dict[str, Any]] = []
    wi_api_stmt = select(WorkItem).where(
        WorkItem.project_id == project_id, WorkItem.record_type == "api_specification"
    )
    wi_api_res = await session.execute(wi_api_stmt)
    for wi in wi_api_res.scalars().all():
        p = wi.payload or {}
        endpoints = p.get("endpoints", [])
        for ep in endpoints:
            all_endpoints.append({
                "path": f"{ep.get('method', 'GET').upper()} {ep.get('path', '')}",
                "story_ids": ep.get("story_ids") or ep.get("storyIds") or [],
            })

    # Normalize requirement list
    normalized_reqs: list[tuple[str, str]] = []
    for r in requirements:
        normalized_reqs.append((r.requirement_key, r.title))
    if not normalized_reqs:
        for wr in wi_requirements:
            p = wr.payload or {}
            normalized_reqs.append((p.get("id", str(wr.id)), wr.title or p.get("title", "")))

    links: list[TraceabilityLink] = []
    linked_story_ids: set[str] = set()
    orphaned_reqs: list[str] = []

    for req_id, req_title in normalized_reqs:
        matching_stories = [
            s.get("id") or s.get("story_key")
            for s in all_stories
            if req_id in (s.get("source_requirement_ids") or s.get("sourceRequirementIds") or [])
            or (req_id in str(s))
        ]
        matching_stories = [sid for sid in matching_stories if sid]
        for sid in matching_stories:
            linked_story_ids.add(sid)

        matching_criteria = [
            c.get("id")
            for c in all_criteria
            if any(sid in str(c.get("story_id")) for sid in matching_stories)
            or req_id in (c.get("source_requirement_ids") or [])
        ]
        matching_criteria = [cid for cid in matching_criteria if cid]

        matching_tests = [
            t.get("id")
            for t in all_tests
            if any(cid in str(t.get("criteria_id")) for cid in matching_criteria)
            or any(sid in str(t.get("story_id")) for sid in matching_stories)
        ]
        matching_tests = [tid for tid in matching_tests if tid]

        matching_endpoints = [
            ep.get("path")
            for ep in all_endpoints
            if any(sid in ep.get("story_ids", []) for sid in matching_stories)
        ]
        matching_endpoints = [ep for ep in matching_endpoints if ep]

        # Calculate coverage score for this requirement (up to 100%)
        # Story (30%), AC (25%), Tests (25%), Endpoint (20%)
        score = 0.0
        if matching_stories:
            score += 30.0
        if matching_criteria:
            score += 25.0
        if matching_tests:
            score += 25.0
        if matching_endpoints:
            score += 20.0

        if not matching_stories:
            orphaned_reqs.append(req_id)

        links.append(
            TraceabilityLink(
                requirement_id=req_id,
                requirement_title=req_title,
                story_ids=matching_stories,
                criteria_ids=matching_criteria,
                test_case_ids=matching_tests,
                spec_endpoints=matching_endpoints,
                coverage_score=round(score, 1),
            )
        )

    # Speculative stories = stories without a mapped requirement
    all_story_ids = {s.get("id") or s.get("story_key") for s in all_stories if s.get("id") or s.get("story_key")}
    speculative_stories = list(all_story_ids - linked_story_ids)

    covered_count = sum(1 for link in links if link.coverage_score >= 50.0)
    total_reqs = len(links)
    overall_coverage = round((covered_count / total_reqs * 100.0), 1) if total_reqs > 0 else 0.0

    return TraceabilityMatrixResponse(
        links=links,
        orphaned_requirements=orphaned_reqs,
        speculative_stories=speculative_stories,
        coverage_score=overall_coverage,
        total_requirements=total_reqs,
        covered_requirements=covered_count,
    )

