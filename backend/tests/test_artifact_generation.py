import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Artifact, ArtifactVersion, Project, Requirement, WorkItem


@pytest.mark.asyncio
async def test_generate_user_stories_with_rag_requirements(
    async_client: AsyncClient, db_session: AsyncSession
):
    """Test generating user stories linked to Engineer 1's ingested requirements."""
    # 1. Register & login PM (who has projects:create and artifacts:generate)
    reg = await async_client.post("/api/v1/auth/register", json={
        "name": "Bob PM",
        "email": "bob.pm@devpilot.demo",
        "password": "Password123!",
        "role": "project_manager",
    })
    token = (await async_client.post("/api/v1/auth/login", json={
        "email": "bob.pm@devpilot.demo",
        "password": "Password123!",
    })).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create project
    proj_res = await async_client.post(
        "/api/v1/projects",
        json={"name": "Retail Core Banking", "description": "Core transaction processing"},
        headers=headers,
    )
    project_id = proj_res.json()["id"]

    # 3. Add an ingested requirement (as produced by Engineer 1)
    req = Requirement(
        project_id=uuid.UUID(project_id),
        requirement_key="REQ-101",
        title="Multi-Factor Authentication",
        description="The system must require a one-time passcode for transactions exceeding $10,000.",
        category="security",
        priority="must",
        created_by=uuid.UUID(reg.json()["id"]),
    )
    db_session.add(req)
    await db_session.commit()
    await db_session.refresh(req)

    # 4. Generate user stories for this requirement
    gen_res = await async_client.post(
        f"/api/v1/projects/{project_id}/artifacts/generate/user-stories",
        json={"title": "MFA Stories", "requirement_ids": [str(req.id)]},
        headers=headers,
    )
    assert gen_res.status_code == 201
    data = gen_res.json()
    assert data["title"] == "MFA Stories"
    assert data["artifact_type"] == "user_stories"
    assert data["status"] == "draft"

    # Verify latest version payload contains INVEST stories
    assert data["current_version"] is not None
    payload = data["current_version"]["payload"]
    assert "stories" in payload
    assert len(payload["stories"]) > 0
    story = payload["stories"][0]
    assert "REQ-101" in story["source_requirement_keys"]

    # Verify traceability: version records source_requirement_ids
    assert str(req.id) in data["current_version"]["source_requirement_ids"]


@pytest.mark.asyncio
async def test_generate_user_stories_from_work_item_requirements(
    async_client: AsyncClient, db_session: AsyncSession
):
    """Workspace requirements are stored as WorkItem records; the generation
    API must accept their UUIDs and record them for traceability."""
    reg = await async_client.post("/api/v1/auth/register", json={
        "name": "WorkItem PM",
        "email": "workitem.pm@devpilot.demo",
        "password": "Password123!",
        "role": "project_manager",
    })
    token = (await async_client.post("/api/v1/auth/login", json={
        "email": "workitem.pm@devpilot.demo",
        "password": "Password123!",
    })).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    proj_res = await async_client.post(
        "/api/v1/projects",
        json={"name": "Work Item Banking", "description": "Workspace requirements"},
        headers=headers,
    )
    project_id = proj_res.json()["id"]

    item = WorkItem(
        project_id=uuid.UUID(project_id),
        record_type="requirement",
        title="Step-up Authentication",
        status="confirmed",
        payload={
            "description": "Require a one-time passcode for high-value transfers.",
            "category": "security",
            "priority": "must",
        },
        source_ids=[],
        created_by=uuid.UUID(reg.json()["id"]),
    )
    db_session.add(item)
    await db_session.commit()
    await db_session.refresh(item)

    gen_res = await async_client.post(
        f"/api/v1/projects/{project_id}/artifacts/generate/user-stories",
        json={"title": "Work Item Stories", "requirement_ids": [str(item.id)]},
        headers=headers,
    )
    assert gen_res.status_code == 201
    data = gen_res.json()
    assert data["artifact_type"] == "user_stories"
    assert data["title"] == "Work Item Stories"
    assert str(item.id) in data["current_version"]["source_requirement_ids"]


@pytest.mark.asyncio
async def test_generate_acceptance_criteria_and_test_cases(
    async_client: AsyncClient, db_session: AsyncSession
):
    """Test generating acceptance criteria and test cases."""
    # Register & login PM
    reg = await async_client.post("/api/v1/auth/register", json={
        "name": "Dev PM",
        "email": "dev.pm@devpilot.demo",
        "password": "Password123!",
        "role": "project_manager",
    })
    token = (await async_client.post("/api/v1/auth/login", json={
        "email": "dev.pm@devpilot.demo",
        "password": "Password123!",
    })).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    proj_res = await async_client.post(
        "/api/v1/projects",
        json={"name": "Payments API", "description": "High throughput payment rails"},
        headers=headers,
    )
    project_id = proj_res.json()["id"]

    # Ingest requirement
    req = Requirement(
        project_id=uuid.UUID(project_id),
        requirement_key="REQ-201",
        title="Payment Idempotency",
        description="The payment endpoint shall support idempotency keys to prevent double charging.",
        category="functional",
        priority="must",
        created_by=uuid.UUID(reg.json()["id"]),
    )
    db_session.add(req)
    await db_session.commit()

    # Generate Acceptance Criteria
    ac_res = await async_client.post(
        f"/api/v1/projects/{project_id}/artifacts/generate/acceptance-criteria",
        json={"title": "Idempotency AC"},
        headers=headers,
    )
    assert ac_res.status_code == 201
    ac_data = ac_res.json()
    assert ac_data["artifact_type"] == "acceptance_criteria"
    ac_payload = ac_data["current_version"]["payload"]
    assert "acceptance_criteria" in ac_payload
    assert len(ac_payload["acceptance_criteria"]) >= 2
    assert all(
        "REQ-201" in item["source_requirement_keys"]
        for item in ac_payload["acceptance_criteria"]
    )

    # Generate Test Cases
    tc_res = await async_client.post(
        f"/api/v1/projects/{project_id}/artifacts/generate/test-cases",
        json={"title": "Idempotency Test Cases"},
        headers=headers,
    )
    assert tc_res.status_code == 201
    tc_data = tc_res.json()
    assert tc_data["artifact_type"] == "test_cases"
    tc_payload = tc_data["current_version"]["payload"]
    assert "test_cases" in tc_payload
    assert all(
        "REQ-201" in item["source_requirement_keys"]
        for item in tc_payload["test_cases"]
    )


@pytest.mark.asyncio
async def test_generate_openapi_spec(
    async_client: AsyncClient, db_session: AsyncSession
):
    """Test generating OpenAPI 3.1 specifications."""
    reg = await async_client.post("/api/v1/auth/register", json={
        "name": "API PM",
        "email": "api.pm@devpilot.demo",
        "password": "Password123!",
        "role": "project_manager",
    })
    token = (await async_client.post("/api/v1/auth/login", json={
        "email": "api.pm@devpilot.demo",
        "password": "Password123!",
    })).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    proj_res = await async_client.post(
        "/api/v1/projects",
        json={"name": "Accounts Service", "description": "Customer account operations"},
        headers=headers,
    )
    project_id = proj_res.json()["id"]

    spec_res = await async_client.post(
        f"/api/v1/projects/{project_id}/artifacts/generate/api-spec",
        json={"title": "Accounts OpenAPI Spec"},
        headers=headers,
    )
    assert spec_res.status_code == 201
    data = spec_res.json()
    assert data["artifact_type"] == "api_specification"
    payload = data["current_version"]["payload"]
    assert payload["openapi"] == "3.1.0"
    assert "paths" in payload
