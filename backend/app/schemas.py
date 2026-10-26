import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import ArtifactType, ReviewStatus


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


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    created_by: uuid.UUID


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ArtifactCreate(BaseModel):
    artifact_type: ArtifactType
    title: str = Field(min_length=1, max_length=300)
    created_by: uuid.UUID
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
