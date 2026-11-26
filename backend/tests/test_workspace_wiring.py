import pytest


@pytest.mark.asyncio
async def test_metadata_and_requirement_review_survive_reload(async_client, e4_users_and_projects):
    headers = e4_users_and_projects["admin_headers"]
    created = await async_client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "Release workspace", "tags": ["release", "api"], "status": "on_hold"},
    )
    assert created.status_code == 201
    project_id = created.json()["id"]
    loaded = await async_client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert loaded.json()["tags"] == ["release", "api"]
    assert loaded.json()["status"] == "on_hold"
    requirement = await async_client.post(
        f"/api/v1/projects/{project_id}/requirements",
        headers=headers,
        json={
            "requirement_key": "REQ-RELEASE",
            "title": "Track releases",
            "description": "The system must track releases.",
            "status": "in_review",
            "category": "functional",
            "priority": "must",
        },
    )
    assert requirement.status_code == 201
    updated = await async_client.patch(
        f"/api/v1/projects/{project_id}/requirements/{requirement.json()['id']}",
        headers=headers,
        json={"status": "confirmed"},
    )
    assert updated.status_code == 200
    rows = await async_client.get(f"/api/v1/projects/{project_id}/requirements", headers=headers)
    assert rows.json()[0]["status"] == "confirmed"
    wrong_project = e4_users_and_projects["project"].id
    mismatch = await async_client.patch(
        f"/api/v1/projects/{wrong_project}/requirements/{requirement.json()['id']}",
        headers=headers,
        json={"status": "rejected"},
    )
    assert mismatch.status_code == 404


@pytest.mark.asyncio
async def test_assistant_persistence_and_project_isolation(
    async_client, e4_users_and_projects, db_session
):
    project = e4_users_and_projects["project"]
    admin = e4_users_and_projects["admin_headers"]
    pm = e4_users_and_projects["pm_headers"]
    response = await async_client.post(
        f"/api/v1/projects/{project.id}/assistant/messages",
        headers=admin,
        json={"text": "Summarize requirements"},
    )
    assert response.status_code == 200
    assert len(response.json()["messages"]) == 2
    answer = response.json()["messages"][1]
    assert "AI generation is not configured" in answer["text"]
    assert answer["isMock"] is True
    assert answer["sourceArtifacts"]
    reload = await async_client.get(f"/api/v1/projects/{project.id}/assistant", headers=admin)
    assert reload.json()["messages"] == response.json()["messages"]
    other_user = await async_client.get(f"/api/v1/projects/{project.id}/assistant", headers=pm)
    assert other_user.json()["messages"] == []
    work_items = await async_client.get(f"/api/v1/projects/{project.id}/work-items", headers=pm)
    assert not any(row["record_type"] == "assistant_conversation" for row in work_items.json())
    outsider = await async_client.post(
        f"/api/v1/projects/{project.id}/assistant/messages",
        headers=e4_users_and_projects["outsider_headers"],
        json={"text": "Summarize"},
    )
    assert outsider.status_code == 403
