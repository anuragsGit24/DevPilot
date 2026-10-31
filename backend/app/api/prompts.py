"""PromptOps REST endpoints (Engineer 4, UC-10 / TO-4)."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, get_client_ip, verify_project_access
from app.core.audit import record_audit_log
from app.core.security import has_role_capability
from app.models import (
    Prompt,
    PromptLifecycleState,
    PromptVersion,
)
from app.promptops.lifecycle import IllegalPromptTransition, transition
from app.promptops.regression import run_regression
from app.promptops.versioning import create_version, seed_project_prompts
from app.schemas import (
    PromptRead,
    PromptRegressionRead,
    PromptVersionCreate,
    PromptVersionRead,
)

router = APIRouter(prefix="/prompts", tags=["prompts"])


async def _load_prompt(session: AsyncSession, prompt_id: uuid.UUID) -> Prompt:
    result = await session.execute(
        select(Prompt).where(Prompt.id == prompt_id).options(selectinload(Prompt.versions))
    )
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prompt '{prompt_id}' was not found.",
        )
    return prompt


async def _load_versions(session: AsyncSession, prompt_id: uuid.UUID) -> list[PromptVersion]:
    result = await session.execute(
        select(PromptVersion)
        .where(PromptVersion.prompt_id == prompt_id)
        .order_by(PromptVersion.version_number)
    )
    return list(result.scalars().all())


async def _load_version(
    session: AsyncSession, prompt_id: uuid.UUID, version_number: int
) -> PromptVersion:
    result = await session.execute(
        select(PromptVersion).where(
            PromptVersion.prompt_id == prompt_id,
            PromptVersion.version_number == version_number,
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {version_number} was not found for prompt '{prompt_id}'.",
        )
    return version


async def _ensure_prompt_access(
    session: AsyncSession, prompt: Prompt, user, capability: str
) -> None:
    """Project-scoped prompts check project membership; global prompts check global RBAC."""
    if prompt.project_id:
        await verify_project_access(prompt.project_id, user, session, capability)
        return
    if not has_role_capability(user.role, capability):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: role '{user.role.value}' lacks capability '{capability}'.",
        )


@router.get("", response_model=list[PromptRead])
async def list_prompts(
    current_user: CurrentUser,
    session: DbSession,
    project_id: uuid.UUID | None = None,
) -> list[Prompt]:
    """List prompts, optionally filtered to a project the caller is a member of."""
    if project_id:
        await verify_project_access(project_id, current_user, session, "prompts:view")
        stmt = select(Prompt).where(Prompt.project_id == project_id)
    else:
        if not has_role_capability(current_user.role, "prompts:view"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(f"Forbidden: role '{current_user.role.value}' lacks capability 'prompts:view'."),
            )
        stmt = select(Prompt)
    stmt = stmt.options(selectinload(Prompt.versions))
    return list((await session.execute(stmt.order_by(Prompt.created_at))).scalars().all())


@router.post("/seed", response_model=list[PromptRead], status_code=status.HTTP_201_CREATED)
async def seed_prompts(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> list[Prompt]:
    """Materialize canonical v1 prompts (idempotent) for a project."""
    await verify_project_access(project_id, current_user, session, "prompts:view")
    await seed_project_prompts(session, project_id, current_user)
    # Re-load with versions eagerly attached for response serialization.
    prompts = list(
        (await session.execute(
            select(Prompt)
            .where(Prompt.project_id == project_id)
            .options(selectinload(Prompt.versions))
            .order_by(Prompt.created_at)
        )).scalars().all()
    )
    await record_audit_log(
        session,
        action="PROMPTS_SEEDED",
        user_id=current_user.id,
        entity_type="project",
        entity_id=str(project_id),
        details={"prompts": [p.prompt_key for p in prompts]},
    )
    await session.commit()
    return prompts


@router.post(
    "/{prompt_id}/versions",
    response_model=PromptVersionRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_prompt_version(
    request: Request,
    prompt_id: uuid.UUID,
    payload: PromptVersionCreate,
    current_user: CurrentUser,
    session: DbSession,
) -> PromptVersion:
    """Create a new immutable prompt revision (deduped by checksum)."""
    prompt = await _load_prompt(session, prompt_id)
    await _ensure_prompt_access(session, prompt, current_user, "prompts:manage")
    version, _created = await create_version(
        session,
        prompt,
        current_user,
        payload.system_prompt,
        payload.user_prompt,
        model=payload.model,
        temperature=payload.temperature,
    )
    await record_audit_log(
        session,
        action="PROMPT_VERSION_CREATED",
        user_id=current_user.id,
        entity_type="prompt",
        entity_id=str(prompt.id),
        entity_title=prompt.name,
        ip_address=get_client_ip(request),
        details={"version_number": version.version_number, "checksum": version.checksum[:12]},
    )
    await session.commit()
    return version


@router.post(
    "/{prompt_id}/versions/{version_number}/regression",
    response_model=PromptRegressionRead,
    status_code=status.HTTP_201_CREATED,
)
async def run_prompt_regression(
    request: Request,
    prompt_id: uuid.UUID,
    version_number: int,
    current_user: CurrentUser,
    session: DbSession,
    baseline_version_number: int | None = None,
) -> PromptRegressionRead:
    """Run regression fixtures against a candidate prompt revision."""
    prompt = await _load_prompt(session, prompt_id)
    await _ensure_prompt_access(session, prompt, current_user, "prompts:manage")
    candidate = await _load_version(session, prompt_id, version_number)
    baseline = (
        await _load_version(session, prompt_id, baseline_version_number)
        if baseline_version_number is not None
        else None
    )
    regression = await run_regression(session, prompt, candidate, baseline, current_user)
    await record_audit_log(
        session,
        action="PROMPT_REGRESSION_RUN",
        user_id=current_user.id,
        entity_type="prompt",
        entity_id=str(prompt.id),
        entity_title=prompt.name,
        ip_address=get_client_ip(request),
        details={"candidate": version_number, "is_pass": regression.is_pass},
    )
    await session.commit()
    return PromptRegressionRead(
        id=regression.id,
        prompt_id=regression.prompt_id,
        candidate_version_number=version_number,
        baseline_version_number=baseline.version_number if baseline else None,
        is_pass=regression.is_pass,
        results=regression.results,
        run_at=regression.run_at,
    )


@router.post(
    "/{prompt_id}/versions/{version_number}/activate",
    response_model=PromptRead,
)
async def activate_prompt_version(
    request: Request,
    prompt_id: uuid.UUID,
    version_number: int,
    current_user: CurrentUser,
    session: DbSession,
) -> Prompt:
    """Promote a *tested* prompt revision to 'active' (one active revision per prompt)."""
    prompt = await _load_prompt(session, prompt_id)
    await _ensure_prompt_access(session, prompt, current_user, "prompts:activate")
    version = await _load_version(session, prompt_id, version_number)

    try:
        new_state = transition(prompt.lifecycle_state, PromptLifecycleState.active)
    except IllegalPromptTransition as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    prompt.lifecycle_state = new_state
    prompt.active_version_number = version.version_number
    await session.flush()
    await record_audit_log(
        session,
        action="PROMPT_ACTIVATED",
        user_id=current_user.id,
        entity_type="prompt",
        entity_id=str(prompt.id),
        entity_title=prompt.name,
        ip_address=get_client_ip(request),
        details={"activated_version_number": version.version_number},
    )
    await session.commit()
    return prompt


@router.post("/{prompt_id}/versions/{version_number}/retire", response_model=PromptRead)
async def retire_prompt(
    request: Request,
    prompt_id: uuid.UUID,
    version_number: int,
    current_user: CurrentUser,
    session: DbSession,
) -> Prompt:
    """Retire the prompt; 'retired' is a terminal lifecycle state."""
    prompt = await _load_prompt(session, prompt_id)
    await _ensure_prompt_access(session, prompt, current_user, "prompts:activate")
    try:
        new_state = transition(prompt.lifecycle_state, PromptLifecycleState.retired)
    except IllegalPromptTransition as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    prompt.lifecycle_state = new_state
    prompt.active_version_number = None
    await session.flush()
    await record_audit_log(
        session,
        action="PROMPT_RETIRED",
        user_id=current_user.id,
        entity_type="prompt",
        entity_id=str(prompt.id),
        entity_title=prompt.name,
        ip_address=get_client_ip(request),
        details={"last_version_number": version_number},
    )
    await session.commit()
    return prompt
