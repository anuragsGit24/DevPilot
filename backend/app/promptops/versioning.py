"""Prompt version creation and seeding utilities."""
from __future__ import annotations

import hashlib
import string
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import Prompt, PromptLifecycleState, PromptVersion, User


def utc_now() -> datetime:
    return datetime.now(UTC)


def compute_checksum(system_prompt: str, user_prompt: str) -> str:
    """Stable content identifier for a prompt revision (sha256 of the text pair)."""
    digest = hashlib.sha256()
    digest.update(system_prompt.encode("utf-8"))
    digest.update(b"\x1e")  # field separator
    digest.update(user_prompt.encode("utf-8"))
    return digest.hexdigest()


async def _next_version_number(session: AsyncSession, prompt_id: uuid.UUID) -> int:
    result = await session.execute(
        select(PromptVersion.version_number)
        .where(PromptVersion.prompt_id == prompt_id)
        .order_by(PromptVersion.version_number.desc())
        .limit(1)
    )
    latest = result.scalar_one_or_none()
    return (latest or 0) + 1


async def create_version(
    session: AsyncSession,
    prompt: Prompt,
    user: User,
    system_prompt: str,
    user_prompt: str,
    model: str | None = None,
    temperature: float | None = None,
) -> tuple[PromptVersion, bool]:
    """Create a new immutable prompt version. Duplicate content returns the existing row.

    Returns (version, created) where created=False means checksum dedupe hit.
    """
    checksum = compute_checksum(system_prompt, user_prompt)
    existing = (await session.execute(
        select(PromptVersion).where(
            PromptVersion.prompt_id == prompt.id,
            PromptVersion.checksum == checksum,
        )
    )).scalar_one_or_none()
    if existing:
        return existing, False

    variables: list[str] = []
    for _, field_name, _, _ in string.Formatter().parse(user_prompt):
        if field_name:
            variables.append(field_name)

    version = PromptVersion(
        prompt_id=prompt.id,
        version_number=await _next_version_number(session, prompt.id),
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        model=model,
        temperature=temperature,
        checksum=checksum,
        variables=variables,
        created_at=utc_now(),
        created_by=user.id,
    )
    session.add(version)
    await session.flush()
    return version, True


CANONICAL_PROMPT_SEEDS: list[dict[str, Any]] = []


def _register_seed(
    prompt_key: str,
    name: str,
    artifact_type: str,
    system_attr: str,
    user_attr: str,
) -> None:
    CANONICAL_PROMPT_SEEDS.append({
        "prompt_key": prompt_key,
        "name": name,
        "artifact_type": artifact_type,
        "system_attr": system_attr,
        "user_attr": user_attr,
    })


_register_seed("user_stories", "User Story Generation Prompt", "user_stories",
               "USER_STORIES_SYSTEM_PROMPT", "USER_STORIES_PROMPT")
_register_seed("acceptance_criteria", "Acceptance Criteria Generation Prompt", "acceptance_criteria",
               "ACCEPTANCE_CRITERIA_SYSTEM_PROMPT", "ACCEPTANCE_CRITERIA_PROMPT")
_register_seed("test_cases", "Test Case Generation Prompt", "test_cases",
               "TEST_CASES_SYSTEM_PROMPT", "TEST_CASES_PROMPT")
_register_seed("api_specification", "OpenAPI Specification Prompt", "api_specification",
               "OPENAPI_SPEC_SYSTEM_PROMPT", "OPENAPI_SPEC_PROMPT")


async def seed_project_prompts(session: AsyncSession, project_id: uuid.UUID, user: User) -> list[Prompt]:
    """Idempotently materialize v1 of each canonical prompt for a project."""
    from app.prompts import templates

    promoted: list[Prompt] = []
    settings = get_settings()
    for seed in CANONICAL_PROMPT_SEEDS:
        prompt_key = f"{seed['prompt_key']}_v1"
        existing = (await session.execute(
            select(Prompt).where(
                Prompt.project_id == project_id,
                Prompt.prompt_key == prompt_key,
            )
        )).scalar_one_or_none()
        if existing:
            promoted.append(existing)
            continue
        prompt = Prompt(
            project_id=project_id,
            prompt_key=prompt_key,
            name=seed["name"],
            description="Seeded from app.prompts.templates canonical definition.",
            artifact_type=seed["artifact_type"],
            lifecycle_state=PromptLifecycleState.draft,
            created_at=utc_now(),
            updated_at=utc_now(),
            created_by=user.id,
        )
        session.add(prompt)
        await session.flush()
        system_prompt = getattr(templates, seed["system_attr"])
        user_prompt = getattr(templates, seed["user_attr"])
        _version, _created = await create_version(
            session,
            prompt,
            user,
            system_prompt,
            user_prompt,
            model=settings.llm_model,
        )
        prompt.active_version_number = None  # stays 'draft' until tested/activated
        promoted.append(prompt)
    await session.flush()
    return promoted
