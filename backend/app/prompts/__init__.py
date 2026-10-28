"""Prompt management and templates for DevPilot AI generation pipeline."""
from app.prompts.templates import (
    ACCEPTANCE_CRITERIA_PROMPT,
    OPENAPI_SPEC_PROMPT,
    TEST_CASES_PROMPT,
    USER_STORIES_PROMPT,
)

__all__ = [
    "USER_STORIES_PROMPT",
    "ACCEPTANCE_CRITERIA_PROMPT",
    "TEST_CASES_PROMPT",
    "OPENAPI_SPEC_PROMPT",
]
