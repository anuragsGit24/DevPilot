"""Unit + API tests for prompt lifecycle, versioning and regression (Engineer 4)."""
import uuid

import pytest
from e4_helpers import make_user
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    ProjectMember,
    Prompt,
    PromptLifecycleState,
    PromptRegressionRun,
    PromptVersion,
    UserRole,
)
from app.promptops.lifecycle import IllegalPromptTransition, can_transition, transition
from app.promptops.regression import run_regression
from app.promptops.versioning import compute_checksum, create_version, seed_project_prompts
from app.prompts import templates as prompt_templates

# ──────────────────────────────────────────────────────────────────────────────
# Lifecycle state machine (pure)
# ──────────────────────────────────────────────────────────────────────────────

def test_lifecycle_happy_path():
    assert transition(PromptLifecycleState.draft, PromptLifecycleState.tested) == PromptLifecycleState.tested
    assert transition(PromptLifecycleState.tested, PromptLifecycleState.active) == PromptLifecycleState.active
    assert transition(PromptLifecycleState.active, PromptLifecycleState.retired) == PromptLifecycleState.retired


def test_lifecycle_illegal_hops():
    with pytest.raises(IllegalPromptTransition):
        transition(PromptLifecycleState.draft, PromptLifecycleState.active)
    with pytest.raises(IllegalPromptTransition):
        transition(PromptLifecycleState.draft, PromptLifecycleState.retired)
    with pytest.raises(IllegalPromptTransition):
        transition(PromptLifecycleState.retired, PromptLifecycleState.draft)
    with pytest.raises(IllegalPromptTransition):
        transition(PromptLifecycleState.tested, PromptLifecycleState.draft)


def test_lifecycle_can_transition_predicate():
    assert can_transition(PromptLifecycleState.draft, PromptLifecycleState.tested)
    assert not can_transition(PromptLifecycleState.retired, PromptLifecycleState.active)


# ──────────────────────────────────────────────────────────────────────────────
# Versioning
# ──────────────────────────────────────────────────────────────────────────────

def test_checksum_stable_and_content_sensitive():
    assert compute_checksum("a", "b") == compute_checksum("a", "b")
    assert compute_checksum("a", "b") != compute_checksum("b", "a")
    assert compute_checksum("a\nb", "c") != compute_checksum("ab", "c")


async def _make_prompt(db_session: AsyncSession, e4: dict, key: str = "user_stories_v1") -> Prompt:
    prompt = Prompt(
        project_id=e4["project"].id,
        prompt_key=key,
        name="User Story Prompt",
        artifact_type="user_stories",
        lifecycle_state=PromptLifecycleState.draft,
        created_by=e4["pm"].id,
    )
    db_session.add(prompt)
    await db_session.flush()
    return prompt


async def test_version_dedupe(db_session: AsyncSession, e4_users_and_projects: dict):
    e4 = e4_users_and_projects
    prompt = await _make_prompt(db_session, e4)
    v1, created1 = await create_version(db_session, prompt, e4["pm"], "SYS", "USER")
    duplicate, created2 = await create_version(db_session, prompt, e4["pm"], "SYS", "USER")
    v2, created3 = await create_version(db_session, prompt, e4["pm"], "SYS v2", "USER")
    assert created1 and not created2 and created3
    assert v1.id == duplicate.id
    assert v2.version_number == 2
    await db_session.commit()
    versions = (await db_session.execute(
        select(PromptVersion).where(PromptVersion.prompt_id == prompt.id)
    )).scalars().all()
    assert len(versions) == 2


async def test_seed_project_prompts_idempotent(db_session: AsyncSession, e4_users_and_projects: dict):
    e4 = e4_users_and_projects
    first = await seed_project_prompts(db_session, e4["project"].id, e4["pm"])
    second = await seed_project_prompts(db_session, e4["project"].id, e4["pm"])
    assert len(first) == len(second) == 4
    keys = {prompt.prompt_key for prompt in first}
    assert keys == {
        "user_stories_v1", "acceptance_criteria_v1", "test_cases_v1", "api_specification_v1"
    }
    assert [p.prompt_key for p in second] == [p.prompt_key for p in first]
    for prompt in first:
        assert prompt.lifecycle_state == PromptLifecycleState.draft
        versions = (await db_session.execute(
            select(PromptVersion).where(PromptVersion.prompt_id == prompt.id)
        )).scalars().all()
        assert len(versions) == 1
        assert versions[0].version_number == 1


# ──────────────────────────────────────────────────────────────────────────────
# Regression runner (mock LLM)
# ──────────────────────────────────────────────────────────────────────────────

async def test_regression_runner_passes_with_mock_llm(
    db_session: AsyncSession, e4_users_and_projects: dict
):
    e4 = e4_users_and_projects
    prompt = await _make_prompt(db_session, e4, "reg_pass_user_stories_v1")
    candidate, _ = await create_version(
        db_session, prompt, e4["pm"],
        prompt_templates.USER_STORIES_SYSTEM_PROMPT,
        prompt_templates.USER_STORIES_PROMPT,
    )
    await db_session.commit()
    regression = await run_regression(db_session, prompt, candidate, None, e4["pm"])
    await db_session.commit()
    assert regression.is_pass is True
    assert len(regression.results) == 1
    assert regression.results[0]["verdict"] == "pass"
    assert regression.results[0]["candidate_ok"] is True
    assert regression.results[0]["coverage_equal"] is True
    # successful regression promotes draft -> tested
    assert prompt.lifecycle_state == PromptLifecycleState.tested


async def test_regression_runner_detects_candidate_regression(
    db_session: AsyncSession, e4_users_and_projects: dict, monkeypatch
):
    """A candidate that fails generation (or loses coverage) must score 'fail'."""
    from app.ai.llm import LLMError
    from app.promptops import regression as regression_module

    e4 = e4_users_and_projects
    prompt = await _make_prompt(db_session, e4, "reg_fail_user_stories_v1")
    candidate, _ = await create_version(db_session, prompt, e4["pm"], "SYS", "USER")

    class BrokenLLM:
        async def generate_structured(
            self, system_prompt, user_prompt, response_schema=None, temperature=None
        ):
            raise LLMError("Candidate LLM produced garbage")

    monkeypatch.setattr(regression_module, "default_llm_client", BrokenLLM())
    baseline, _ = await create_version(db_session, prompt, e4["pm"], "SYS", "USER")
    regression = await run_regression(db_session, prompt, candidate, baseline, e4["pm"])
    await db_session.commit()
    assert regression.is_pass is False
    assert regression.results[0]["verdict"] == "fail"
    assert regression.results[0]["candidate_ok"] is False
    # failing regression must NOT promote the prompt out of draft
    assert prompt.lifecycle_state == PromptLifecycleState.draft


# ──────────────────────────────────────────────────────────────────────────────
# Prompt REST API
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_seed_and_list_prompts_api(
    async_client: AsyncClient, db_session: AsyncSession, e4_users_and_projects: dict
):
    e4 = e4_users_and_projects
    project_id = e4["project"].id
    seeded = await async_client.post(
        f"/api/v1/prompts/seed?project_id={project_id}", headers=e4["pm_headers"]
    )
    assert seeded.status_code == 201, seeded.text
    assert len(seeded.json()) == 4

    listed = await async_client.get(f"/api/v1/prompts?project_id={project_id}", headers=e4["pm_headers"])
    assert listed.status_code == 200
    prompts = listed.json()
    assert len(prompts) == 4
    for prompt in prompts:
        assert prompt["lifecycle_state"] == "draft"
        assert prompt["active_version_number"] is None
        assert len(prompt["versions"]) == 1


@pytest.mark.asyncio
async def test_seed_prompts_is_idempotent(
    async_client: AsyncClient, db_session: AsyncSession, e4_users_and_projects: dict
):
    e4 = e4_users_and_projects
    project_id = e4["project"].id
    first = await async_client.post(f"/api/v1/prompts/seed?project_id={project_id}", headers=e4["pm_headers"])
    second = await async_client.post(f"/api/v1/prompts/seed?project_id={project_id}", headers=e4["pm_headers"])
    assert first.status_code == second.status_code == 201
    listed = await async_client.get(f"/api/v1/prompts?project_id={project_id}", headers=e4["pm_headers"])
    assert len(listed.json()) == 4


@pytest.mark.asyncio
async def test_create_version_and_checksum_dedupe_api(
    async_client: AsyncClient, db_session: AsyncSession, e4_users_and_projects: dict
):
    e4 = e4_users_and_projects
    project_id = e4["project"].id
    seeded = await async_client.post(f"/api/v1/prompts/seed?project_id={project_id}", headers=e4["pm_headers"])
    prompts = seeded.json()
    user_stories_prompt = next(p for p in prompts if p["prompt_key"] == "user_stories_v1")

    body = {"system_prompt": "SYS-A", "user_prompt": "USER-A"}
    v2 = await async_client.post(f"/api/v1/prompts/{user_stories_prompt['id']}/versions", json=body, headers=e4["admin_headers"])
    assert v2.status_code == 201
    assert v2.json()["version_number"] == 2
    assert v2.json()["checksum"] == compute_checksum("SYS-A", "USER-A")

    duplicate = await async_client.post(f"/api/v1/prompts/{user_stories_prompt['id']}/versions", json=body, headers=e4["admin_headers"])
    assert duplicate.status_code == 201
    assert duplicate.json()["id"] == v2.json()["id"]
    assert duplicate.json()["version_number"] == 2

    # PM lacks prompts:manage -> version creation forbidden for PM
    forbidden_pm = await async_client.post(f"/api/v1/prompts/{user_stories_prompt['id']}/versions", json=body, headers=e4["pm_headers"])
    assert forbidden_pm.status_code == 403

    v3 = await async_client.post(f"/api/v1/prompts/{user_stories_prompt['id']}/versions",
                                 json={"system_prompt": "SYS-A", "user_prompt": "USER-B"}, headers=e4["admin_headers"])
    assert v3.json()["version_number"] == 3


@pytest.mark.asyncio
async def test_activate_requires_tested_state(
    async_client: AsyncClient, db_session: AsyncSession, e4_users_and_projects: dict
):
    e4 = e4_users_and_projects
    project_id = e4["project"].id
    seeded = await async_client.post(f"/api/v1/prompts/seed?project_id={project_id}", headers=e4["pm_headers"])
    user_stories_prompt = next(p for p in seeded.json() if p["prompt_key"] == "user_stories_v1")

    # draft -> active must be rejected with 409
    rejected = await async_client.post(
        f"/api/v1/prompts/{user_stories_prompt['id']}/versions/1/activate", headers=e4["admin_headers"]
    )
    assert rejected.status_code == 409
    assert "draft" in rejected.json()["error"]["message"]


@pytest.mark.asyncio
async def test_full_lifecycle_via_api_draft_tested_active_retired(
    async_client: AsyncClient, db_session: AsyncSession, e4_users_and_projects: dict
):
    e4 = e4_users_and_projects
    project_id = e4["project"].id
    seeded = await async_client.post(f"/api/v1/prompts/seed?project_id={project_id}", headers=e4["pm_headers"])
    prompt = next(p for p in seeded.json() if p["prompt_key"] == "user_stories_v1")

    # draft --(passing regression by admin, who holds prompts:manage)--> tested
    regression = await async_client.post(
        f"/api/v1/prompts/{prompt['id']}/versions/1/regression", headers=e4["admin_headers"]
    )
    assert regression.status_code == 201, regression.text
    body = regression.json()
    assert body["is_pass"] is True
    assert body["candidate_version_number"] == 1
    assert body["baseline_version_number"] is None

    # tested --(admin activation)--> active
    activated = await async_client.post(
        f"/api/v1/prompts/{prompt['id']}/versions/1/activate", headers=e4["admin_headers"]
    )
    assert activated.status_code == 200, activated.text
    assert activated.json()["lifecycle_state"] == "active"
    assert activated.json()["active_version_number"] == 1

    # PM lacks prompts:activate capability -> BA cannot retire/activate
    ba_user = make_user("e4-ba@devpilot.test", "E4 BA", UserRole.business_analyst)
    from app.core.security import create_access_token, hash_password

    ba_user.password_hash = hash_password("Pass123!")
    member = ProjectMember(project_id=project_id, user_id=ba_user.id, role=UserRole.business_analyst)
    db_session.add_all([ba_user, member])
    await db_session.commit()
    ba_headers = {"Authorization": f"Bearer {create_access_token(str(ba_user.id), ba_user.email, ba_user.role.value)}"}
    forbidden = await async_client.post(
        f"/api/v1/prompts/{prompt['id']}/versions/1/retire", headers=ba_headers
    )
    assert forbidden.status_code == 403

    # active -> retired
    retired = await async_client.post(
        f"/api/v1/prompts/{prompt['id']}/versions/1/retire", headers=e4["admin_headers"]
    )
    assert retired.status_code == 200
    assert retired.json()["lifecycle_state"] == "retired"
    assert retired.json()["active_version_number"] is None

    # retired is terminal: activate again -> 409
    reactivated = await async_client.post(
        f"/api/v1/prompts/{prompt['id']}/versions/1/activate", headers=e4["admin_headers"]
    )
    assert reactivated.status_code == 409


@pytest.mark.asyncio
async def test_regression_writes_persisted_rows(
    async_client: AsyncClient, db_session: AsyncSession, e4_users_and_projects: dict
):
    e4 = e4_users_and_projects
    project_id = e4["project"].id
    seeded = await async_client.post(f"/api/v1/prompts/seed?project_id={project_id}", headers=e4["pm_headers"])
    prompt = next(p for p in seeded.json() if p["prompt_key"] == "test_cases_v1")
    response = await async_client.post(
        f"/api/v1/prompts/{prompt['id']}/versions/1/regression", headers=e4["admin_headers"]
    )
    assert response.status_code == 201

    stored = (await db_session.execute(
        select(PromptRegressionRun).where(PromptRegressionRun.prompt_id == uuid.UUID(prompt["id"]))
    )).scalars().all()
    assert len(stored) == 1
    assert stored[0].prompt_id == uuid.UUID(prompt["id"])


@pytest.mark.asyncio
async def test_version_endpoint_unknown_prompt_404(
    async_client: AsyncClient, e4_users_and_projects: dict
):
    e4 = e4_users_and_projects
    response = await async_client.post(
        f"/api/v1/prompts/{uuid.uuid4()}/versions",
        json={"system_prompt": "A", "user_prompt": "B"},
        headers=e4["admin_headers"],
    )
    assert response.status_code == 404
