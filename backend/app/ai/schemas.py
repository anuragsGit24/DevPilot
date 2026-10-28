"""
Structured output Pydantic schemas for AI-generated SDLC artifacts.
Enforces type safety, JSON schema consistency, and eliminates hallucinations.
"""
from typing import Any
from pydantic import BaseModel, Field


class InvestEvaluation(BaseModel):
    is_independent: bool = True
    is_negotiable: bool = True
    is_valuable: bool = True
    is_estimable: bool = True
    is_small: bool = True
    is_testable: bool = True
    notes: str = ""


class GeneratedUserStory(BaseModel):
    story_key: str = Field(description="Unique identifier e.g. US-001")
    title: str = Field(description="Short descriptive story title")
    as_a: str = Field(description="Target persona or user role")
    i_want: str = Field(description="Specific capability requested")
    so_that: str = Field(description="Business outcome or value")
    invest_evaluation: InvestEvaluation = Field(default_factory=InvestEvaluation)
    estimated_story_points: int = Field(default=3, ge=1, le=21)
    priority: str = Field(default="must")
    source_requirement_keys: list[str] = Field(default_factory=list)
    acceptance_criteria_hints: list[str] = Field(default_factory=list)


class UserStoriesPayload(BaseModel):
    summary: str
    stories: list[GeneratedUserStory]


class GeneratedAcceptanceCriteria(BaseModel):
    criteria_key: str = Field(description="Unique criteria ID e.g. AC-001")
    story_key: str | None = Field(default=None, description="Associated story key")
    title: str
    scenario_type: str = Field(description="happy_path, boundary, negative, or security")
    given: str = Field(description="Preconditions / initial context")
    when: str = Field(description="Trigger action / event")
    then: str = Field(description="Expected outcome / assertions")
    source_requirement_keys: list[str] = Field(default_factory=list)


class AcceptanceCriteriaPayload(BaseModel):
    summary: str
    acceptance_criteria: list[GeneratedAcceptanceCriteria]


class GeneratedTestCase(BaseModel):
    __test__ = False
    test_key: str = Field(description="Unique test ID e.g. TC-001")
    title: str
    category: str = Field(default="functional", description="functional, negative, boundary, security")
    priority: str = Field(default="medium", description="critical, high, medium, low")
    preconditions: list[str] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)
    expected_result: str
    test_data: dict[str, Any] = Field(default_factory=dict)
    source_requirement_keys: list[str] = Field(default_factory=list)


class TestCasesPayload(BaseModel):
    __test__ = False
    summary: str
    test_cases: list[GeneratedTestCase]


class OpenApiSpecPayload(BaseModel):
    openapi: str = "3.1.0"
    info: dict[str, Any]
    servers: list[dict[str, Any]] = Field(default_factory=list)
    paths: dict[str, Any]
    components: dict[str, Any] = Field(default_factory=dict)
    source_requirement_keys: list[str] = Field(default_factory=list, alias="x-source-requirement-keys")
