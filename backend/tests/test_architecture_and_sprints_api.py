"""
API Integration tests for Architecture Recommendation & Sprint Planning (Engineer 3).
Validates authentication, project authorization, request validation, persistence,
retrieval, cycle error responses, and idempotency.
"""

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.models import Project, ProjectMember, Requirement, User, UserRole, WorkItem


@pytest.fixture
async def test_users_and_projects(db_session: AsyncSession):
    """Seed test users and projects for authorization and cross-project boundary tests."""
    admin = User(
        id=uuid.uuid4(),
        email="admin@devpilot.test",
        password_hash=hash_password("Pass123!"),
        name="Admin User",
        role=UserRole.admin,
    )
    pm = User(
        id=uuid.uuid4(),
        email="pm@devpilot.test",
        password_hash=hash_password("Pass123!"),
        name="PM User",
        role=UserRole.project_manager,
    )
    outsider = User(
        id=uuid.uuid4(),
        email="outsider@devpilot.test",
        password_hash=hash_password("Pass123!"),
        name="Outsider User",
        role=UserRole.developer,
    )
    db_session.add_all([admin, pm, outsider])
    await db_session.flush()

    # Project A
    proj_a = Project(
        id=uuid.uuid4(),
        name="Project A - Banking",
        description="Retail Banking System",
        created_by=admin.id,
    )
    # Project B (for cross-project checks)
    proj_b = Project(
        id=uuid.uuid4(),
        name="Project B - Isolated",
        description="Isolated Project",
        created_by=outsider.id,
    )
    db_session.add_all([proj_a, proj_b])
    await db_session.flush()

    # Assign PM to Project A
    member_a = ProjectMember(project_id=proj_a.id, user_id=pm.id, role=UserRole.project_manager)
    # Assign Outsider to Project B
    member_b = ProjectMember(project_id=proj_b.id, user_id=outsider.id, role=UserRole.developer)
    db_session.add_all([member_a, member_b])

    # Seed a requirement in Project A
    req1 = Requirement(
        id=uuid.uuid4(),
        project_id=proj_a.id,
        requirement_key="REQ-001",
        title="Biometric Authentication Hardware Integration",
        description="Mobile client must authenticate via Secure Enclave hardware with low latency.",
        created_by=pm.id,
    )
    db_session.add(req1)
    await db_session.commit()

    return {
        "admin": admin,
        "pm": pm,
        "outsider": outsider,
        "proj_a": proj_a,
        "proj_b": proj_b,
        "admin_token": create_access_token(str(admin.id), admin.email, admin.role.value),
        "pm_token": create_access_token(str(pm.id), pm.email, pm.role.value),
        "outsider_token": create_access_token(str(outsider.id), outsider.email, outsider.role.value),
    }


# ──────────────────────────────────────────────────────────────────────────────
# Architecture Recommendation API Tests
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_recommend_architecture_success(
    async_client: AsyncClient, test_users_and_projects: dict
):
    """POST /architecture/recommend returns valid structured output and persists a work item."""
    proj_id = test_users_and_projects["proj_a"].id
    token = test_users_and_projects["pm_token"]

    payload = {
        "context": "Retail banking application requiring high scalability and strict PCI-DSS compliance.",
    }

    response = await async_client.post(
        f"/api/v1/projects/{proj_id}/architecture/recommend",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["project_id"] == str(proj_id)
    assert data["pattern"] in ["Modular Monolith", "Microservices", "Event-Driven Microservices", "API-First Modular Monolith"]
    assert len(data["components"]) > 0
    assert len(data["data_stores"]) > 0
    assert len(data["security_patterns"]) > 0
    assert len(data["adrs"]) > 0
    assert data["provider"].startswith("llm") or data["provider"] == "rules_based"
    assert data["source_requirement_count"] == 1

    # Verify retrieval via GET /architecture
    get_res = await async_client.get(
        f"/api/v1/projects/{proj_id}/architecture",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["id"] == data["id"]
    assert get_data["pattern"] == data["pattern"]


@pytest.mark.asyncio
async def test_architecture_unauthenticated_returns_401(
    async_client: AsyncClient, test_users_and_projects: dict
):
    """Calling architecture endpoints without token must return 401 Unauthorized."""
    proj_id = test_users_and_projects["proj_a"].id
    res = await async_client.post(
        f"/api/v1/projects/{proj_id}/architecture/recommend",
        json={"context": "test"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_architecture_cross_project_denial_returns_403(
    async_client: AsyncClient, test_users_and_projects: dict
):
    """Outsider without membership in Project A must be denied access."""
    proj_a_id = test_users_and_projects["proj_a"].id
    outsider_token = test_users_and_projects["outsider_token"]

    res = await async_client.post(
        f"/api/v1/projects/{proj_a_id}/architecture/recommend",
        json={"context": "test"},
        headers={"Authorization": f"Bearer {outsider_token}"},
    )
    assert res.status_code == 403


# ──────────────────────────────────────────────────────────────────────────────
# Sprint Planning API Tests
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_plan_sprints_with_explicit_stories(
    async_client: AsyncClient, test_users_and_projects: dict
):
    """POST /sprints/plan with explicit stories generates and persists sprint plan."""
    proj_id = test_users_and_projects["proj_a"].id
    token = test_users_and_projects["pm_token"]

    payload = {
        "capacity_story_points": 30,
        "sprint_duration_weeks": 2,
        "stories": [
            {
                "id": "US-001",
                "title": "Auth Foundation",
                "priority": "must",
                "acceptance_criteria_count": 3,
                "dependency_ids": [],
            },
            {
                "id": "US-002",
                "title": "Transaction Core",
                "priority": "must",
                "acceptance_criteria_count": 4,
                "dependency_ids": ["US-001"],
            },
            {
                "id": "US-003",
                "title": "Reporting View",
                "priority": "should",
                "acceptance_criteria_count": 2,
                "dependency_ids": ["US-002"],
            },
        ],
    }

    response = await async_client.post(
        f"/api/v1/projects/{proj_id}/sprints/plan",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["total_stories_planned"] == 3
    assert data["total_sprints"] >= 1
    assert len(data["estimates"]) == 3
    assert data["topo_order"] == ["US-001", "US-002", "US-003"]

    # Verify retrieval via GET /sprints
    list_res = await async_client.get(
        f"/api/v1/projects/{proj_id}/sprints",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_res.status_code == 200
    sprints = list_res.json()
    assert len(sprints) == data["total_sprints"]
    assert sprints[0]["project_id"] == str(proj_id)
    assert "US-001" in sprints[0]["story_ids"]


@pytest.mark.asyncio
async def test_plan_sprints_cycle_returns_422(
    async_client: AsyncClient, test_users_and_projects: dict
):
    """A dependency cycle must return HTTP 422 with diagnostic message."""
    proj_id = test_users_and_projects["proj_a"].id
    token = test_users_and_projects["pm_token"]

    payload = {
        "stories": [
            {"id": "A", "title": "A", "priority": "must", "dependency_ids": ["B"]},
            {"id": "B", "title": "B", "priority": "must", "dependency_ids": ["A"]},
        ]
    }

    response = await async_client.post(
        f"/api/v1/projects/{proj_id}/sprints/plan",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422
    err_body = response.json()
    msg = str(err_body)
    assert "Dependency cycle detected" in msg


@pytest.mark.asyncio
async def test_plan_sprints_unknown_dependency_returns_422(
    async_client: AsyncClient, test_users_and_projects: dict
):
    """Unknown dependency IDs must return HTTP 422 with the offending IDs."""
    proj_id = test_users_and_projects["proj_a"].id
    token = test_users_and_projects["pm_token"]

    payload = {
        "stories": [
            {"id": "US-1", "title": "Story 1", "priority": "must", "dependency_ids": ["MISSING_DEP"]}
        ]
    }

    response = await async_client.post(
        f"/api/v1/projects/{proj_id}/sprints/plan",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422
    assert "Unknown dependency" in str(response.json())


@pytest.mark.asyncio
async def test_plan_sprints_empty_stories_returns_422(
    async_client: AsyncClient, test_users_and_projects: dict
):
    """Empty stories with no DB stories must return HTTP 422."""
    proj_id = test_users_and_projects["proj_a"].id
    token = test_users_and_projects["pm_token"]

    response = await async_client.post(
        f"/api/v1/projects/{proj_id}/sprints/plan",
        json={"stories": []},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422
    assert "No user stories available" in str(response.json())


@pytest.mark.asyncio
async def test_plan_sprints_repeatability_and_purge(
    async_client: AsyncClient, test_users_and_projects: dict
):
    """Calling /sprints/plan multiple times safely replaces previous sprint records without duplication."""
    proj_id = test_users_and_projects["proj_a"].id
    token = test_users_and_projects["pm_token"]

    payload1 = {
        "stories": [{"id": "S1", "title": "Story 1", "priority": "must"}]
    }
    payload2 = {
        "stories": [
            {"id": "S2", "title": "Story 2", "priority": "must"},
            {"id": "S3", "title": "Story 3", "priority": "must"},
        ]
    }

    # First plan
    res1 = await async_client.post(
        f"/api/v1/projects/{proj_id}/sprints/plan",
        json=payload1,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 201

    # Second plan should replace first
    res2 = await async_client.post(
        f"/api/v1/projects/{proj_id}/sprints/plan",
        json=payload2,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 201

    # Check GET /sprints
    list_res = await async_client.get(
        f"/api/v1/projects/{proj_id}/sprints",
        headers={"Authorization": f"Bearer {token}"},
    )
    sprints = list_res.json()
    all_story_ids = [sid for sp in sprints for sid in sp["story_ids"]]
    assert "S1" not in all_story_ids
    assert "S2" in all_story_ids
    assert "S3" in all_story_ids


@pytest.mark.asyncio
async def test_plan_sprints_preserves_manual_sprints(
    async_client: AsyncClient, test_users_and_projects: dict, db_session: AsyncSession
):
    """Re-planning must preserve manual sprints and only overwrite auto-planner sprints."""
    proj_id = test_users_and_projects["proj_a"].id
    token = test_users_and_projects["pm_token"]
    user_id = test_users_and_projects["pm"].id

    # Create a manual sprint directly
    manual_sprint = WorkItem(
        project_id=proj_id,
        record_type="sprint",
        title="Manual Hardening Sprint",
        status="active",
        payload={
            "source": "manual",
            "is_manual": True,
            "sprint_number": 99,
            "startDate": "2026-12-01",
            "endDate": "2026-12-14",
            "userStoryIds": ["MANUAL-001"],
            "totalPoints": 5,
            "capacityStoryPoints": 20,
            "goal": "Manual sprint for security audits",
        },
        source_ids=[],
        created_by=user_id,
    )
    db_session.add(manual_sprint)
    await db_session.commit()

    # Plan sprints via API
    payload = {
        "stories": [
            {"id": "AUTO-001", "title": "Auto Story 1", "priority": "must"},
            {"id": "AUTO-002", "title": "Auto Story 2", "priority": "should"},
        ]
    }
    plan_res = await async_client.post(
        f"/api/v1/projects/{proj_id}/sprints/plan",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert plan_res.status_code == 201

    # Verify both manual sprint and auto sprint are present
    list_res = await async_client.get(
        f"/api/v1/projects/{proj_id}/sprints",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_res.status_code == 200
    sprints = list_res.json()
    sprint_names = [sp["name"] for sp in sprints]
    assert "Manual Hardening Sprint" in sprint_names
    assert any("Sprint 1" in name for name in sprint_names)


@pytest.mark.asyncio
async def test_recommend_architecture_mock_llm_and_fallback(
    async_client: AsyncClient, test_users_and_projects: dict, monkeypatch
):
    """Verifies structured generation with mock provider, and truthful rules_based fallback when LLM fails."""
    proj_id = test_users_and_projects["proj_a"].id
    token = test_users_and_projects["pm_token"]

    # 1. Success with mock LLM provider
    res_llm = await async_client.post(
        f"/api/v1/projects/{proj_id}/architecture/recommend",
        json={"context": "High-throughput retail banking service with PostgreSQL and Kafka."},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_llm.status_code == 201
    data_llm = res_llm.json()
    assert data_llm["provider"].startswith("llm")
    assert len(data_llm["components"]) > 0

    # 2. Simulate LLM failure and assert truthful rules_based fallback
    from app.ai.llm import default_llm_client

    async def _mock_failing_generate(*args, **kwargs):
        raise RuntimeError("Simulated upstream LLM outage")

    monkeypatch.setattr(default_llm_client, "generate_structured", _mock_failing_generate)

    res_fallback = await async_client.post(
        f"/api/v1/projects/{proj_id}/architecture/recommend",
        json={"context": "Small team startup with simple monolith requirements."},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_fallback.status_code == 201
    data_fallback = res_fallback.json()
    assert data_fallback["provider"] == "rules_based"
    assert "LLM generation was unavailable" in data_fallback["rationale"]


