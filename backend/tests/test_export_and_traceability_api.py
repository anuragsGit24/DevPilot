"""
Integration tests for Multi-Format Export Hub and Traceability Matrix (Engineer 5).
Validates authentication, authorization, ZIP structure/contents, and traceability metrics.
"""

import io
import uuid
import zipfile
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.models import (
    Project,
    ProjectMember,
    Requirement,
    User,
    UserRole,
    WorkItem,
)


@pytest.fixture
async def export_test_context(db_session: AsyncSession):
    user = User(
        id=uuid.uuid4(),
        email="dev5@devpilot.test",
        password_hash=hash_password("Pass123!"),
        name="Engineer 5",
        role=UserRole.developer,
    )
    db_session.add(user)

    project = Project(
        id=uuid.uuid4(),
        name="Retail Banking Export Test",
        description="Testing multi-format zip export and traceability matrix",
        created_by=user.id,
    )
    db_session.add(project)

    member = ProjectMember(
        project_id=project.id,
        user_id=user.id,
        role=UserRole.developer,
    )
    db_session.add(member)

    # Seed atomic requirement
    req = Requirement(
        id=uuid.uuid4(),
        project_id=project.id,
        requirement_key="REQ-101",
        title="Biometric FaceID Gate",
        description="User must be authenticated via FaceID before viewing balance.",
        category="security",
        priority="must",
        created_by=user.id,
    )
    db_session.add(req)

    # Seed user story work item
    story_wi = WorkItem(
        id=uuid.uuid4(),
        project_id=project.id,
        record_type="user_story",
        title="FaceID Login",
        payload={
            "id": "US-101",
            "title": "FaceID Login",
            "role": "Account Holder",
            "action": "log in with FaceID",
            "benefit": "access funds securely",
            "storyPoints": 5,
            "sourceRequirementIds": ["REQ-101"],
        },
        created_by=user.id,
    )
    db_session.add(story_wi)

    await db_session.commit()
    return {
        "user": user,
        "project": project,
        "token": create_access_token(str(user.id), user.email, user.role.value),
    }


@pytest.mark.asyncio
async def test_export_zip_unauthorized_returns_401(async_client: AsyncClient, export_test_context):
    pid = export_test_context["project"].id
    resp = await async_client.post(f"/api/v1/projects/{pid}/export/zip", json={"formats": ["zip"]})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_export_zip_success_contains_valid_archive(async_client: AsyncClient, export_test_context):
    pid = export_test_context["project"].id
    token = export_test_context["token"]

    resp = await async_client.post(
        f"/api/v1/projects/{pid}/export/zip",
        json={"formats": ["markdown", "gherkin", "openapi_yaml", "zip"]},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/zip"
    assert "attachment; filename=" in resp.headers["content-disposition"]

    # Verify that the returned bytes form a valid, non-empty ZIP archive
    zip_bytes = io.BytesIO(resp.content)
    with zipfile.ZipFile(zip_bytes, "r") as zf:
        namelist = zf.namelist()
        assert "README.md" in namelist
        assert "requirements/requirements.md" in namelist
        assert "stories/user_stories.md" in namelist

        readme = zf.read("README.md").decode("utf-8")
        assert "DevPilot Multi-Format Artifact Export Bundle" in readme

        req_content = zf.read("requirements/requirements.md").decode("utf-8")
        assert "REQ-101" in req_content
        assert "Biometric FaceID Gate" in req_content


@pytest.mark.asyncio
async def test_traceability_matrix_api(async_client: AsyncClient, export_test_context):
    pid = export_test_context["project"].id
    token = export_test_context["token"]

    resp = await async_client.get(
        f"/api/v1/projects/{pid}/traceability/matrix",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert "links" in data
    assert "coverage_score" in data
    assert len(data["links"]) >= 1

    link = data["links"][0]
    assert link["requirement_id"] == "REQ-101"
    assert "US-101" in link["story_ids"]
    assert link["coverage_score"] > 0
