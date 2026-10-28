import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_artifact_versioning_and_status_transitions(
    async_client: AsyncClient, db_session: AsyncSession
):
    """Test manual creation of new artifact version and review status lifecycle."""
    # Register & login
    reg = await async_client.post("/api/v1/auth/register", json={
        "name": "PM Manager",
        "email": "pm.manager@devpilot.demo",
        "password": "Password123!",
        "role": "project_manager",
    })
    token = (await async_client.post("/api/v1/auth/login", json={
        "email": "pm.manager@devpilot.demo",
        "password": "Password123!",
    })).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create project
    proj_res = await async_client.post(
        "/api/v1/projects",
        json={"name": "Mortgage Portal", "description": "Loan origination"},
        headers=headers,
    )
    project_id = proj_res.json()["id"]

    # Generate initial artifact
    art_res = await async_client.post(
        f"/api/v1/projects/{project_id}/artifacts/generate/user-stories",
        json={"title": "Origination Stories"},
        headers=headers,
    )
    artifact_id = art_res.json()["id"]

    # 1. Verify version 1 exists
    versions_res = await async_client.get(
        f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/versions",
        headers=headers,
    )
    assert versions_res.status_code == 200
    versions = versions_res.json()
    assert len(versions) == 1
    assert versions[0]["version_number"] == 1

    # 2. Add an updated version 2 (e.g. human edited/refined story payload)
    new_payload = {"stories": [{"story_key": "US-001", "title": "Refined Story v2"}]}
    v2_res = await async_client.post(
        f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/versions",
        json={"payload": new_payload},
        headers=headers,
    )
    assert v2_res.status_code == 201
    v2_data = v2_res.json()
    assert v2_data["version_number"] == 2
    assert v2_data["payload"] == new_payload

    # 3. Retrieve artifact detail and verify current_version is v2
    detail_res = await async_client.get(
        f"/api/v1/projects/{project_id}/artifacts/{artifact_id}",
        headers=headers,
    )
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["versions"]) == 2
    assert detail["current_version"]["version_number"] == 2

    # 4. Update status: draft -> in_review -> accepted
    status_res = await async_client.patch(
        f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/status",
        json={"status": "in_review"},
        headers=headers,
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "in_review"

    accept_res = await async_client.patch(
        f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/status",
        json={"status": "accepted"},
        headers=headers,
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "accepted"


@pytest.mark.asyncio
async def test_cross_project_artifact_access_is_forbidden(
    async_client: AsyncClient, db_session: AsyncSession
):
    """Verify project-scoped isolation: User from Project A cannot access Project B artifacts."""
    # User A
    await async_client.post("/api/v1/auth/register", json={
        "name": "User Alpha", "email": "alpha@devpilot.demo", "password": "Password123!", "role": "project_manager"
    })
    token_a = (await async_client.post("/api/v1/auth/login", json={
        "email": "alpha@devpilot.demo", "password": "Password123!"
    })).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # User B
    await async_client.post("/api/v1/auth/register", json={
        "name": "User Beta", "email": "beta@devpilot.demo", "password": "Password123!", "role": "project_manager"
    })
    token_b = (await async_client.post("/api/v1/auth/login", json={
        "email": "beta@devpilot.demo", "password": "Password123!"
    })).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Project Alpha
    proj_a = (await async_client.post(
        "/api/v1/projects", json={"name": "Alpha Project"}, headers=headers_a
    )).json()["id"]

    # User A generates artifact
    art_a = (await async_client.post(
        f"/api/v1/projects/{proj_a}/artifacts/generate/user-stories", json={}, headers=headers_a
    )).json()["id"]

    # User B attempts to access Project Alpha's artifact -> 403 Forbidden
    forbidden_get = await async_client.get(
        f"/api/v1/projects/{proj_a}/artifacts/{art_a}", headers=headers_b
    )
    assert forbidden_get.status_code == 403

    # User B attempts to generate on Project Alpha -> 403 Forbidden
    forbidden_gen = await async_client.post(
        f"/api/v1/projects/{proj_a}/artifacts/generate/user-stories", json={}, headers=headers_b
    )
    assert forbidden_gen.status_code == 403
