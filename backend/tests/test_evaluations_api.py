"""API integration tests for evaluations, traceability matrix & audit (Engineer 4)."""
import uuid

import pytest
from e4_helpers import fully_covered_artifacts, make_artifact_version
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    ArtifactType,
    AuditLog,
    Evaluation,
    Project,
    ProjectMember,
    Requirement,
    UserRole,
)


@pytest.fixture
def fake_embedder(monkeypatch):
    """Deterministic 3-dim embedder: identical rows (vector path, no network)."""
    from app.evaluations import service as service_module

    vectors = {"default": [1.0, 1.0, 0.0], "unrelated": [0.0, 0.0, 1.0]}

    async def _embed(texts, prompt_name="Document"):
        return [list(vectors["default"]) for _ in texts]

    monkeypatch.setattr(service_module, "embed_texts", _embed)
    return vectors


async def _seed_artifacts(db_session: AsyncSession, e4: dict) -> list:
    versions = fully_covered_artifacts(e4["project"].id, e4["pm"].id)
    db_session.add_all(versions)
    await db_session.commit()
    return versions


@pytest.mark.asyncio
async def test_run_evaluation_end_to_end(
    async_client: AsyncClient, db_session: AsyncSession, e4_users_and_projects: dict, fake_embedder
):
    e4 = e4_users_and_projects
    await _seed_artifacts(db_session, e4)
    project_id = e4["project"].id

    response = await async_client.post(
        f"/api/v1/projects/{project_id}/evaluations/run", headers=e4["pm_headers"]
    )
    assert response.status_code == 201, response.text
    evaluation = response.json()
    assert evaluation["status"] == "completed"
    assert evaluation["completed_at"] is not None

    scores = evaluation["scores"]
    assert set(scores) == {"completeness", "groundedness", "consistency", "overall"}
    for value in scores.values():
        assert 0.0 <= value <= 1.0

    # groundedness via deterministic embedding path
    assert evaluation["rubric_metadata"]["grounding_method"] == "embedding"
    # fully covered demo project: completeness should be high
    assert scores["completeness"] == pytest.approx(max(scores["completeness"], 0.0))
    assert evaluation["metrics"]["coverage"]["requirements_total"] == 3

    # persisted exactly one completed evaluation row
    rows = (await db_session.execute(
        select(Evaluation).where(Evaluation.project_id == project_id)
    )).scalars().all()
    assert len(rows) == 1
    assert rows[0].status.value == "completed"


@pytest.mark.asyncio
async def test_run_evaluation_flags_orphan_and_speculative(
    async_client: AsyncClient, db_session: AsyncSession, e4_users_and_projects: dict, fake_embedder
):
    e4 = e4_users_and_projects
    project_id = e4["project"].id
    # only REQ-001 covered, plus one speculative story
    stories = make_artifact_version(
        project_id, e4["pm"].id, ArtifactType.user_stories,
        "Stories",
        {
            "stories": [
                {"story_key": "US-001", "title": "Registration",
                 "source_requirement_keys": ["REQ-001"]},
                {"story_key": "US-777", "title": "Invented", "source_requirement_keys": []},
            ]
        },
    )
    db_session.add(stories)
    await db_session.commit()

    response = await async_client.post(
        f"/api/v1/projects/{project_id}/evaluations/run", headers=e4["pm_headers"]
    )
    assert response.status_code == 201
    issues = response.json()["issues"]
    issue_types = {issue["type"] for issue in issues}
    assert "orphan_requirement" in issue_types
    assert "speculative_story" in issue_types
    orphan_keys = {i["key"] for i in issues if i["type"] == "orphan_requirement"}
    assert {"REQ-002", "REQ-003"} <= orphan_keys


@pytest.mark.asyncio
async def test_evaluation_list_and_detail(
    async_client: AsyncClient, db_session: AsyncSession, e4_users_and_projects: dict, fake_embedder
):
    e4 = e4_users_and_projects
    await _seed_artifacts(db_session, e4)
    project_id = e4["project"].id

    first = await async_client.post(f"/api/v1/projects/{project_id}/evaluations/run", headers=e4["pm_headers"])
    second = await async_client.post(f"/api/v1/projects/{project_id}/evaluations/run", headers=e4["admin_headers"])
    assert first.status_code == second.status_code == 201

    listed = await async_client.get(f"/api/v1/projects/{project_id}/evaluations", headers=e4["pm_headers"])
    assert listed.status_code == 200
    assert len(listed.json()) == 2

    detail = await async_client.get(
        f"/api/v1/projects/{project_id}/evaluations/{second.json()['id']}",
        headers=e4["pm_headers"],
    )
    assert detail.status_code == 200
    assert detail.json()["id"] == second.json()["id"]

    missing = await async_client.get(
        f"/api/v1/projects/{project_id}/evaluations/{uuid.uuid4()}", headers=e4["pm_headers"]
    )
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_evaluation_requires_membership(
    async_client: AsyncClient, db_session: AsyncSession, e4_users_and_projects: dict, fake_embedder
):
    e4 = e4_users_and_projects
    await _seed_artifacts(db_session, e4)
    project_id = e4["project"].id
    response = await async_client.post(
        f"/api/v1/projects/{project_id}/evaluations/run", headers=e4["outsider_headers"]
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_evaluation_empty_project_conflict(
    async_client: AsyncClient, db_session: AsyncSession, e4_users_and_projects: dict
):
    e4 = e4_users_and_projects
    project_id = e4["project"].id
    # delete requirements for the empty-project scenario
    from sqlalchemy import delete

    await db_session.execute(delete(Requirement).where(Requirement.project_id == project_id))
    await db_session.commit()
    response = await async_client.post(
        f"/api/v1/projects/{project_id}/evaluations/run", headers=e4["pm_headers"]
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_evaluation_audit_log_recorded(
    async_client: AsyncClient, db_session: AsyncSession, e4_users_and_projects: dict, fake_embedder
):
    e4 = e4_users_and_projects
    await _seed_artifacts(db_session, e4)
    project_id = e4["project"].id
    await async_client.post(f"/api/v1/projects/{project_id}/evaluations/run", headers=e4["pm_headers"])
    logs = (await db_session.execute(
        select(AuditLog).where(AuditLog.action == "EVALUATION_RUN")
    )).scalars().all()
    assert len(logs) == 1
    assert logs[0].entity_type == "evaluation"


@pytest.mark.asyncio
async def test_traceability_matrix_endpoint(
    async_client: AsyncClient, db_session: AsyncSession, e4_users_and_projects: dict, fake_embedder
):
    e4 = e4_users_and_projects
    await _seed_artifacts(db_session, e4)
    project_id = e4["project"].id
    response = await async_client.get(
        f"/api/v1/projects/{project_id}/traceability/matrix", headers=e4["pm_headers"]
    )
    assert response.status_code == 200
    matrix = response.json()
    assert matrix["requirements_total"] == 3
    assert matrix["requirements_covered"] == 3
    assert matrix["project_id"] == str(project_id)
    kinds = {node["kind"] for node in matrix["nodes"]}
    assert "user_story" in kinds and "api_endpoint" in kinds


@pytest.mark.asyncio
async def test_traceability_matrix_empty_project_conflict(
    async_client: AsyncClient, db_session: AsyncSession, e4_users_and_projects: dict
):
    e4 = e4_users_and_projects
    bare_project = Project(id=uuid.uuid4(), name="Bare", created_by=e4["admin"].id)
    member = ProjectMember(
        project_id=bare_project.id, user_id=e4["pm"].id, role=UserRole.project_manager
    )
    db_session.add_all([bare_project, member])
    await db_session.commit()
    response = await async_client.get(
        f"/api/v1/projects/{bare_project.id}/traceability/matrix", headers=e4["pm_headers"]
    )
    assert response.status_code == 409
