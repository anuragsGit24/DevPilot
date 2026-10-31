import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models import (
    ArtifactType,
    MoSCoWPriority,
    RequirementCategory,
    ReviewStatus,
    UserRole,
)


class ErrorDetail(BaseModel):
    field: str | None = None
    issue: str


class ErrorBody(BaseModel):
    code: str
    message: str
    request_id: str
    details: list[ErrorDetail] | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody


class HealthResponse(BaseModel):
    status: str
    service: str
    database: str


class GenericResponse(BaseModel):
    status: str = "ok"
    message: str


# Authentication & User Schemas
class UserRegister(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.business_analyst


class UserProvision(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    email: str = Field(min_length=3, max_length=320)
    role: UserRole
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    role: UserRole
    is_active: bool
    failed_login_count: int
    locked_until: datetime | None
    last_login_at: datetime | None
    created_at: datetime

    updated_at: datetime


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserStatusUpdate(BaseModel):
    is_active: bool


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: str | None = None  # Returned in dev/testing mode only for automated verification


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10)
    new_password: str = Field(min_length=8, max_length=128)


# Project Schemas
class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)


class ProjectMemberAdd(BaseModel):
    user_id: uuid.UUID
    role: UserRole


class ProjectMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: uuid.UUID
    user_id: uuid.UUID
    role: UserRole
    joined_at: datetime


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    created_by: uuid.UUID
    created_at: datetime

    updated_at: datetime


# Requirement Schemas
class RequirementCreate(BaseModel):
    requirement_key: str = Field(min_length=1, max_length=30)
    title: str = Field(min_length=1, max_length=300)
    description: str = Field(min_length=1)
    category: RequirementCategory | None = None
    priority: MoSCoWPriority | None = None
    source_document: str | None = Field(default=None, max_length=500)
    source_location: dict | None = None
    embedding_metadata: dict | None = None


class RequirementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    requirement_key: str
    title: str
    description: str
    category: RequirementCategory | None
    priority: MoSCoWPriority | None
    source_document: str | None
    source_location: dict | None
    embedding_metadata: dict | None
    created_by: uuid.UUID
    created_at: datetime

    updated_at: datetime


class RequirementChunkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    requirement_id: uuid.UUID
    chunk_index: int
    content: str
    token_count: int
    embedding_metadata: dict | None


class RequirementsUploadRead(BaseModel):
    filename: str
    requirements_created: int
    chunks_created: int
    embedding_model: str
    embeddings_generated: bool


class RequirementSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    limit: int = Field(default=10, ge=1, le=100)


class RequirementSearchResult(BaseModel):
    requirement: RequirementRead
    chunk: RequirementChunkRead
    similarity: float


class RequirementSearchResponse(BaseModel):
    results: list[RequirementSearchResult]


# Artifact Schemas
class ArtifactCreate(BaseModel):
    artifact_type: ArtifactType
    title: str = Field(min_length=1, max_length=300)
    payload: dict = Field(default_factory=dict)
    source_requirement_ids: list[uuid.UUID] = Field(default_factory=list)


class ArtifactVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    artifact_id: uuid.UUID
    version_number: int
    payload: dict
    source_requirement_ids: list
    created_by: uuid.UUID
    created_at: datetime



class ArtifactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    artifact_type: ArtifactType
    title: str
    status: ReviewStatus
    created_by: uuid.UUID
    created_at: datetime

    updated_at: datetime


class ArtifactDetailRead(ArtifactRead):
    versions: list[ArtifactVersionRead] = Field(default_factory=list)
    current_version: ArtifactVersionRead | None = None


class ArtifactVersionCreate(BaseModel):
    payload: dict = Field(default_factory=dict)
    source_requirement_ids: list[uuid.UUID] = Field(default_factory=list)


class ArtifactStatusUpdate(BaseModel):
    status: ReviewStatus


# AI Generation Schemas (Engineer 2)
class UserStoriesGenerateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    requirement_ids: list[uuid.UUID] | None = None
    query: str | None = Field(default=None, max_length=1000, description="Optional RAG search query")


class AcceptanceCriteriaGenerateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    requirement_ids: list[uuid.UUID] | None = None
    query: str | None = Field(default=None, max_length=1000)


class TestCasesGenerateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    requirement_ids: list[uuid.UUID] | None = None
    query: str | None = Field(default=None, max_length=1000)


class ApiSpecGenerateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    requirement_ids: list[uuid.UUID] | None = None
    query: str | None = Field(default=None, max_length=1000)


class UnifiedGenerateRequest(BaseModel):
    artifact_type: ArtifactType
    title: str | None = Field(default=None, max_length=300)
    requirement_ids: list[uuid.UUID] | None = None
    query: str | None = Field(default=None, max_length=1000)


class WorkItemCreate(BaseModel):
    record_type: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=300)
    status: str | None = Field(default=None, max_length=80)
    payload: dict = Field(default_factory=dict)
    source_ids: list[uuid.UUID] = Field(default_factory=list)
    parent_id: uuid.UUID | None = None


class WorkItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    status: str | None = Field(default=None, max_length=80)
    payload: dict | None = None
    source_ids: list[uuid.UUID] | None = None
    parent_id: uuid.UUID | None = None


class WorkItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    record_type: str
    title: str
    status: str | None
    payload: dict
    source_ids: list
    parent_id: uuid.UUID | None
    created_by: uuid.UUID
    created_at: datetime

    updated_at: datetime

# Audit Log Schemas
class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None
    action: str
    entity_type: str | None
    entity_id: str | None
    entity_title: str | None
    ip_address: str | None
    details: dict | None
    created_at: datetime



# Architecture Recommendation Schemas (Engineer 3)
class ArchitectureRecommendRequest(BaseModel):
    context: str = Field(
        default="",
        max_length=8000,
        description="Explicit requirement constraints, non-functional targets, or compliance signals.",
    )
    requirement_ids: list[uuid.UUID] | None = Field(
        default=None,
        description="Optional list of specific requirement UUIDs to scope the evaluation.",
    )


class ComponentOut(BaseModel):
    name: str
    role: str
    technology: str
    responsibilities: list[str] = Field(default_factory=list)


class AlternativeOut(BaseModel):
    name: str
    rationale: str
    tradeoffs: str


class ADROut(BaseModel):
    id: str
    title: str
    context: str
    decision: str
    consequences: str


class ArchitectureRecommendResponse(BaseModel):
    id: str
    project_id: str
    pattern: str
    summary: str
    components: list[ComponentOut]
    data_stores: list[dict[str, str]]
    security_patterns: list[str]
    resilience_patterns: list[str]
    deployment_topology: str
    alternatives: list[AlternativeOut]
    adrs: list[ADROut]
    risks: list[str]
    assumptions: list[str]
    rationale: str
    evidence: list[str]
    provider: str
    mermaid_diagram: str | None
    source_requirement_count: int
    created_at: str
    updated_at: str


# Sprint Planning & Estimation Schemas (Engineer 3)
class NormalizedStoryIn(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=300)
    priority: str = Field(default="should", max_length=20)
    description: str = Field(default="", max_length=2000)
    acceptance_criteria_count: int = Field(default=0, ge=0, le=100)
    dependency_ids: list[str] = Field(default_factory=list)
    risk_level: str = Field(default="medium", max_length=20)
    complexity: str = Field(default="medium", max_length=20)
    existing_estimate: int | None = Field(
        default=None,
        description="Fibonacci points (1, 2, 3, 5, 8, 13) if previously confirmed.",
    )


class SprintPlanRequest(BaseModel):
    stories: list[NormalizedStoryIn] = Field(
        default_factory=list,
        description="Explicit normalized stories. If empty, project work items of record_type 'user_story' are used.",
    )
    capacity_story_points: int = Field(
        default=30,
        ge=1,
        le=500,
        description="Target story-point velocity per sprint.",
    )
    sprint_duration_weeks: int = Field(
        default=2,
        ge=1,
        le=8,
        description="Sprint cycle length in weeks.",
    )
    start_date: str | None = Field(
        default=None,
        description="ISO date string for start of Sprint 1 (e.g. '2026-11-01'). Defaults to today.",
    )


class StoryEstimateOut(BaseModel):
    story_id: str
    estimated_points: int
    rationale: str
    confidence: str
    assumption: str
    retained_existing: bool


class SprintOut(BaseModel):
    id: str
    project_id: str
    sprint_number: int
    name: str
    goal: str
    start_date: str
    end_date: str
    status: str
    story_ids: list[str]
    total_points: int
    capacity: int
    warnings: list[str] = Field(default_factory=list)
    stories: list[dict[str, Any]] = Field(default_factory=list)
    created_at: str
    updated_at: str


class SprintPlanResponse(BaseModel):
    sprints: list[SprintOut]
    backlog: list[str]
    backlog_reasons: dict[str, str]
    estimates: list[StoryEstimateOut]
    topo_order: list[str]
    critical_path: list[str]
    warnings: list[str]
    overflow_policy: str
    total_sprints: int
    total_stories_planned: int
    total_story_points: int


# Traceability Schemas (Engineer 4)

class TraceNode(BaseModel):
    kind: str  # "requirement" | "user_story" | "acceptance_criteria" | "test_case" | "api_endpoint"
    key: str
    title: str | None = None


class TraceEdge(BaseModel):
    source_kind: str
    source_key: str
    target_kind: str
    target_key: str
    relation: str


class TraceabilityGap(BaseModel):
    type: str  # orphan_requirement | speculative_story | missing_story_link | unknown_requirement_reference
    kind: str | None = None
    key: str | None = None
    detail: str


class RequirementCoverage(BaseModel):
    requirement_key: str
    requirement_title: str | None = None
    requirement_description: str | None = None
    source_document: str | None = None
    source_location: dict | None = None
    covered_by: dict[str, list[str]]
    fully_covered: bool
    score: float


class TraceabilityMatrix(BaseModel):
    nodes: list[TraceNode]
    edges: list[TraceEdge]
    coverage: list[RequirementCoverage]
    gaps: list[TraceabilityGap]
    requirements_total: int
    requirements_covered: int


class TraceabilityMatrixResponse(TraceabilityMatrix):
    project_id: uuid.UUID
    computed_at: datetime
    latest_version_numbers: dict[str, int]


# Evaluation Schemas (Engineer 4)

class EvaluationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    status: str
    triggered_by: str | None = None
    created_by: uuid.UUID
    created_at: datetime
    completed_at: datetime | None = None
    artifact_stats: dict[str, Any] = Field(default_factory=dict)
    metrics: dict[str, Any] = Field(default_factory=dict)
    issues: list[dict[str, Any]] = Field(default_factory=list)
    scores: dict[str, Any] = Field(default_factory=dict)
    summary: str | None = None
    rubric_metadata: dict[str, Any] | None = None


# PromptOps Schemas (Engineer 4)

class PromptVersionRead(BaseModel):
    id: uuid.UUID
    prompt_id: uuid.UUID
    version_number: int
    system_prompt: str
    user_prompt: str
    model: str | None = None
    temperature: float | None = None
    checksum: str
    created_at: datetime


class PromptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID | None = None
    prompt_key: str
    name: str
    description: str | None = None
    artifact_type: str
    lifecycle_state: str
    active_version_number: int | None = None
    versions: list[PromptVersionRead] = Field(default_factory=list)


class PromptVersionCreate(BaseModel):
    system_prompt: str = Field(min_length=1)
    user_prompt: str = Field(min_length=1)
    model: str | None = None
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)


class PromptRegressionResult(BaseModel):
    test_id: str
    artifact_type: str
    baseline_ok: bool
    candidate_ok: bool
    coverage_equal: bool
    verdict: str  # pass | fail
    detail: str | None = None


class PromptRegressionRead(BaseModel):
    id: uuid.UUID
    prompt_id: uuid.UUID
    candidate_version_number: int | None = None
    baseline_version_number: int | None = None
    is_pass: bool
    results: list[PromptRegressionResult] = Field(default_factory=list)
    run_at: datetime
