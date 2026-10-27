import uuid
from datetime import datetime

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
