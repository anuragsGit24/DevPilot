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
    # Required so generated criteria cannot silently become untraceable.
    source_requirement_keys: list[str]


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
    # Required so generated tests cannot silently become untraceable.
    source_requirement_keys: list[str]


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


class GeneratedComponent(BaseModel):
    name: str = Field(description="Component name e.g. API Gateway")
    role: str = Field(description="Role / responsibility summary")
    technology: str = Field(description="Technology or framework used")
    responsibilities: list[str] = Field(default_factory=list)


class GeneratedDataStore(BaseModel):
    type: str = Field(description="Data store category e.g. Relational, Vector, Cache")
    technology: str = Field(description="Specific technology e.g. PostgreSQL, Redis")
    rationale: str = Field(description="Why this data store was selected")


class GeneratedAlternative(BaseModel):
    name: str = Field(description="Alternative architecture pattern or technology")
    rationale: str = Field(description="Why this alternative was considered")
    tradeoffs: str = Field(description="Why this alternative was not selected as primary")


class GeneratedADR(BaseModel):
    id: str = Field(description="ADR ID e.g. ADR-001")
    title: str = Field(description="ADR title")
    context: str = Field(description="Context and problem statement")
    decision: str = Field(description="Decision reached")
    consequences: str = Field(description="Positive and negative trade-offs")


class ArchitectureRecommendationPayload(BaseModel):
    pattern: str = Field(description="Recommended pattern e.g. Modular Monolith, Microservices")
    summary: str = Field(description="High-level architecture blueprint summary")
    components: list[GeneratedComponent] = Field(default_factory=list)
    data_stores: list[GeneratedDataStore] = Field(default_factory=list)
    security_patterns: list[str] = Field(default_factory=list)
    resilience_patterns: list[str] = Field(default_factory=list)
    deployment_topology: str = Field(default="")
    alternatives: list[GeneratedAlternative] = Field(default_factory=list)
    adrs: list[GeneratedADR] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    rationale: str = Field(default="")
    evidence: list[str] = Field(default_factory=list)
