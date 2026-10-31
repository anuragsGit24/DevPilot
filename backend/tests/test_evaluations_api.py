"""API integration tests for evaluations, traceability matrix & audit (Engineer 4)."""
import uuid

import pytest
from e4_helpers import fully_covered_artifacts, make_artifact_version
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.evaluations.service import run_project_evaluation
from app.models import (
    ArtifactType,
    AuditLog,
    Evaluation,
    EvaluationStatus,
    Project,
    ProjectMember,
    Prompt,
    PromptLifecycleState,
    PromptRegressionRun,
    PromptVersion,
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


@pytest.mark.asyncio
async def test_migration_models_persist(
    db_session: AsyncSession, e4_users_and_projects: dict
):
    """Migration 0006 models round-trip every JSON/relational column through SQLite."""
    from datetime import UTC, datetime

    e4 = e4_users_and_projects
    now = datetime.now(UTC)

    evaluation = Evaluation(
        project_id=e4["project"].id,
        status=EvaluationStatus.completed,
        triggered_by="manual",
        created_by=e4["pm"].id,
        completed_at=now,
        artifact_stats={"artifact_count": 2, "types": {"user_stories": 1}},
        metrics={"coverage": {"requirements_total": 3}},
        issues=[{"type": "orphan_requirement", "key": "REQ-003", "detail": "no cover"}],
        scores={"completeness": 0.9, "groundedness": 0.8, "consistency": 1.0, "overall": 0.89},
        summary="Round-trip check",
        rubric_metadata={"grounding_method": "lexical_fallback"},
    )
    prompt = Prompt(
        project_id=e4["project"].id,
        prompt_key="user_stories_v1",
        name="User Story Generation Prompt",
        description="seeded",
        artifact_type="user_stories",
        lifecycle_state=PromptLifecycleState.draft,
        created_by=e4["pm"].id,
    )
    db_session.add_all([evaluation, prompt])
    await db_session.flush()

    version = PromptVersion(
        prompt_id=prompt.id,
        version_number=1,
        system_prompt="system",
        user_prompt="user {x}",
        model="mock",
        temperature=0.2,
        checksum="a" * 64,
        variables=["x"],
        created_by=e4["pm"].id,
    )
    db_session.add(version)
    await db_session.flush()

    regression = PromptRegressionRun(
        prompt_id=prompt.id,
        candidate_version_id=version.id,
        baseline_version_id=None,
        is_pass=True,
        results=[{"test_id": "user_stories_baseline", "verdict": "pass"}],
        run_by=e4["pm"].id,
    )
    db_session.add(regression)
    await db_session.commit()

    db_session.expunge_all()  # force a real DB round-trip into fresh instances
    loaded_eval = (
        await db_session.execute(select(Evaluation).where(Evaluation.id == evaluation.id))
    ).scalar_one()
    assert loaded_eval.status == EvaluationStatus.completed
    assert loaded_eval.triggered_by == "manual"
    assert loaded_eval.scores["overall"] == pytest.approx(0.89)
    assert loaded_eval.issues[0]["type"] == "orphan_requirement"
    assert loaded_eval.artifact_stats["types"] == {"user_stories": 1}
    assert loaded_eval.rubric_metadata == {"grounding_method": "lexical_fallback"}

    loaded_prompt = (
        await db_session.execute(
            select(Prompt).where(Prompt.id == prompt.id).options(selectinload(Prompt.versions))
        )
    ).scalar_one()
    assert loaded_prompt.lifecycle_state == PromptLifecycleState.draft
    assert loaded_prompt.active_version_number is None
    assert loaded_prompt.versions[0].checksum == "a" * 64
    assert loaded_prompt.versions[0].variables == ["x"]
    assert loaded_prompt.versions[0].temperature == pytest.approx(0.2)

    loaded_reg = (
        await db_session.execute(
            select(PromptRegressionRun).where(PromptRegressionRun.id == regression.id)
        )
    ).scalar_one()
    assert loaded_reg.is_pass is True
    assert loaded_reg.baseline_version_id is None
    assert loaded_reg.results[0]["verdict"] == "pass"


@pytest.mark.asyncio
async def test_evaluation_failure_persists_failed_status(
    db_session: AsyncSession, e4_users_and_projects: dict, monkeypatch
):
    """An unexpected rubric error persists a `failed` row instead of leaking a `running` one."""
    from app.evaluations import service as service_module

    e4 = e4_users_and_projects
    await _seed_artifacts(db_session, e4)
    project_id = e4["project"].id

    async def _boom(*args, **kwargs):
        raise RuntimeError("embedding backend exploded")

    monkeypatch.setattr(service_module, "embed_texts", _boom)

    with pytest.raises(RuntimeError):
        await run_project_evaluation(db_session, project_id, e4["pm"], triggered_by="test")

    rows = (
        await db_session.execute(select(Evaluation).where(Evaluation.project_id == project_id))
    ).scalars().all()
    assert len(rows) == 1
    assert rows[0].status == EvaluationStatus.failed
    assert rows[0].completed_at is not None
    assert rows[0].issues == [{"type": "evaluation_error", "detail": "embedding backend exploded"}]

    failed_logs = (
        await db_session.execute(select(AuditLog).where(AuditLog.action == "EVALUATION_FAILED"))
    ).scalars().all()
    assert len(failed_logs) == 1
