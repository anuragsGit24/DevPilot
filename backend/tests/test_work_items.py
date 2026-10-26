from httpx import AsyncClient


async def authenticate(
    client: AsyncClient, email: str, role: str = "business_analyst"
) -> dict[str, str]:
    await client.post(
        "/api/v1/auth/register",
        json={"name": email.split("@")[0], "email": email, "password": "Password123!", "role": role},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def test_work_items_are_persisted_and_project_scoped(async_client: AsyncClient) -> None:
    owner_headers = await authenticate(async_client, "owner@example.com", "project_manager")
    other_headers = await authenticate(async_client, "other@example.com")

    project_response = await async_client.post(
        "/api/v1/projects",
        json={"name": "Owner workspace", "description": "private"},
        headers=owner_headers,
    )
    project_id = project_response.json()["id"]

    item_response = await async_client.post(
        f"/api/v1/projects/{project_id}/work-items",
        json={
            "record_type": "requirement",
            "title": "Persist this requirement",
            "status": "extracted",
            "payload": {"priority": "must"},
        },
        headers=owner_headers,
    )
    assert item_response.status_code == 201
    item_id = item_response.json()["id"]

    listed = await async_client.get(
        f"/api/v1/projects/{project_id}/work-items",
        headers=owner_headers,
    )
    assert listed.status_code == 200
    assert listed.json()[0]["id"] == item_id

    forbidden = await async_client.get(
        f"/api/v1/projects/{project_id}/work-items",
        headers=other_headers,
    )
    assert forbidden.status_code == 403

    updated = await async_client.patch(
        f"/api/v1/projects/{project_id}/work-items/{item_id}",
        json={"status": "confirmed"},
        headers=owner_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "confirmed"
