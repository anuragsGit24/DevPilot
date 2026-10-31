"""Prompt regression runner: compare candidate prompt revisions against a baseline.

Uses structured fixtures (per artifact type) rendered against both revisions,
invokes the provider-neutral mock-capable LLM adapter, and verifies that the
candidate still (a) validates against the artifact payload schema and
(b) preserves the coverage of `source_requirement_keys`.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm import LLMError, default_llm_client
from app.ai.schemas import (
    AcceptanceCriteriaPayload,
    OpenApiSpecPayload,
    TestCasesPayload,
    UserStoriesPayload,
)
from app.models import Prompt, PromptLifecycleState, PromptRegressionRun, PromptVersion, User

SCHEMA_BY_ARTIFACT_TYPE = {
    "user_stories": UserStoriesPayload,
    "acceptance_criteria": AcceptanceCriteriaPayload,
    "test_cases": TestCasesPayload,
    "api_specification": OpenApiSpecPayload,
}

# Deterministic regression fixtures: one canonical input set per artifact type.
REGRESSION_FIXTURES: list[dict[str, Any]] = [
    {
        "test_id": "user_stories_baseline",
        "artifact_type": "user_stories",
        "variables": {
            "project_name": "Fixture Bank Portal",
            "domain_context": "Retail banking onboarding",
            "requirements_context": (
                "- REQ-001: The system must allow customers to register with email and password.\n"
                "- REQ-002: The system shall encrypt passwords before storage.\n"
                "- REQ-003: The portal should render dashboards within two seconds."
            ),
        },
    },
    {
        "test_id": "acceptance_criteria_baseline",
        "artifact_type": "acceptance_criteria",
        "variables": {
            "project_name": "Fixture Bank Portal",
            "requirements_context": (
                "- REQ-001: The system must allow customers to register with email and password.\n"
                "- REQ-002: The system shall encrypt passwords before storage."
            ),
            "stories_context": (
                "- US-001: As a customer, I want to register so that I can access my account.\n"
                "- US-002: As a security officer, I want passwords encrypted at rest."
            ),
        },
    },
    {
        "test_id": "test_cases_baseline",
        "artifact_type": "test_cases",
        "variables": {
            "project_name": "Fixture Bank Portal",
            "requirements_context": "- REQ-001: The system shall encrypt passwords before storage.",
            "stories_context": "- US-001: Registration story with security acceptance criteria.",
        },
    },
    {
        "test_id": "api_specification_baseline",
        "artifact_type": "api_specification",
        "variables": {
            "project_name": "Fixture Bank Portal",
            "requirements_context": (
                "- REQ-001: The system must expose a registration endpoint.\n"
                "- REQ-002: The system shall return authentication tokens."
            ),
        },
    },
]

PROMPT_SYSTEM_ATTRS = {
    "user_stories": ("USER_STORIES_SYSTEM_PROMPT", "USER_STORIES_PROMPT"),
    "acceptance_criteria": ("ACCEPTANCE_CRITERIA_SYSTEM_PROMPT", "ACCEPTANCE_CRITERIA_PROMPT"),
    "test_cases": ("TEST_CASES_SYSTEM_PROMPT", "TEST_CASES_PROMPT"),
    "api_specification": ("OPENAPI_SPEC_SYSTEM_PROMPT", "OPENAPI_SPEC_PROMPT"),
}


def _coverage_keys(payload: Any) -> set[str]:
    """Extract the union of source_requirement_keys from a validated payload."""
    keys: set[str] = set()
    if isinstance(payload, UserStoriesPayload):
        for story in payload.stories:
            keys.update(story.source_requirement_keys)
    elif isinstance(payload, AcceptanceCriteriaPayload):
        for criteria in payload.acceptance_criteria:
            keys.update(criteria.source_requirement_keys)
    elif isinstance(payload, TestCasesPayload):
        for test in payload.test_cases:
            keys.update(test.source_requirement_keys)
    elif isinstance(payload, OpenApiSpecPayload):
        keys.update(payload.source_requirement_keys)
    return keys


def _render(template: str, variables: dict[str, Any]) -> str:
    try:
        return template.format(**variables)
    except (KeyError, IndexError):
        return template  # regression fixtures may under-render older revisions


def _source_keys_from_context(variables: dict[str, Any]) -> set[str]:
    import re

    return set(re.findall(r"REQ-\d+", "\n".join(str(v) for v in variables.values())))


async def run_regression(
    session: AsyncSession,
    prompt: Prompt,
    candidate: PromptVersion,
    baseline: PromptVersion | None,
    user: User,
) -> PromptRegressionRun:
    """Execute every fixture against candidate (and baseline) prompt revisions."""
    artifact_type = prompt.artifact_type
    schema = SCHEMA_BY_ARTIFACT_TYPE.get(artifact_type)
    system_base, _user_base = PROMPT_SYSTEM_ATTRS.get(artifact_type, (None, None))

    results: list[dict[str, Any]] = []
    for fixture in REGRESSION_FIXTURES:
        if fixture["artifact_type"] != artifact_type:
            continue
        variables = fixture["variables"]
        rendered = _render(candidate.user_prompt, variables)
        test_row: dict[str, Any] = {
            "test_id": fixture["test_id"],
            "artifact_type": artifact_type,
            "baseline_ok": True,
            "candidate_ok": False,
            "coverage_equal": False,
            "verdict": "fail",
            "detail": "",
        }

        expected_keys = _source_keys_from_context(variables)

        # Baseline run (defaults to the canonical processor template when None)
        baseline_keys: set[str] | None = None
        if schema and system_base and baseline is not None:
            try:
                baseline_obj, _resp = await default_llm_client.generate_structured(
                    baseline.system_prompt,
                    _render(baseline.user_prompt, variables),
                    response_schema=schema,
                )
                baseline_keys = _coverage_keys(baseline_obj)
                test_row["baseline_ok"] = True
            except LLMError as exc:
                test_row["baseline_ok"] = False
                test_row["detail"] = f"Baseline generation failed: {exc}"

        # Candidate run
        try:
            candidate_obj, _resp = await default_llm_client.generate_structured(
                candidate.system_prompt,
                rendered,
                response_schema=schema,
            )
            candidate_keys = _coverage_keys(candidate_obj)
            test_row["candidate_ok"] = True
        except LLMError as exc:
            test_row["detail"] = (test_row["detail"] + f" Candidate generation failed: {exc}").strip()
            candidate_keys = set()

        if baseline_keys is None:
            baseline_keys = expected_keys
        test_row["coverage_equal"] = candidate_keys == baseline_keys
        test_row["verdict"] = (
            "pass"
            if test_row["candidate_ok"] and test_row["coverage_equal"] and test_row["baseline_ok"]
            else "fail"
        )
        results.append(test_row)

    is_pass = bool(results) and all(row["verdict"] == "pass" for row in results)
    regression = PromptRegressionRun(
        prompt_id=prompt.id,
        candidate_version_id=candidate.id,
        baseline_version_id=baseline.id if baseline else None,
        is_pass=is_pass,
        results=results,
        run_at=datetime.now(UTC),
        run_by=user.id,
    )
    session.add(regression)
    # A passing full-suite regression promotes a draft prompt to 'tested';
    # activation to 'active' remains an explicit, human-gated action.
    if is_pass and prompt.lifecycle_state == PromptLifecycleState.draft and len(results) > 0:
        prompt.lifecycle_state = PromptLifecycleState.tested
    await session.flush()
    return regression
