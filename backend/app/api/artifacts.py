import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.generators import ArtifactGeneratorService
from app.ai.llm import LLMError
from app.api.deps import CurrentUser, DbSession, get_client_ip, verify_project_access
from app.core.audit import record_audit_log
from app.models import Artifact, ArtifactType, ArtifactVersion, Project, ReviewStatus
from app.schemas import (
    AcceptanceCriteriaGenerateRequest,
    ApiSpecGenerateRequest,
    ArtifactCreate,
    ArtifactDetailRead,
    ArtifactRead,
    ArtifactStatusUpdate,
    ArtifactVersionCreate,
    ArtifactVersionRead,
    TestCasesGenerateRequest,
    UnifiedGenerateRequest,
    UserStoriesGenerateRequest,
)

router = APIRouter(prefix="/projects/{project_id}/artifacts", tags=["artifacts"])


# ---------------------------------------------------------------------------
# AI Generation Endpoints (Engineer 2)
# ---------------------------------------------------------------------------

@router.post("/generate/user-stories", response_model=ArtifactDetailRead, status_code=status.HTTP_201_CREATED)
async def generate_user_stories(
    request: Request,
    project_id: uuid.UUID,
    payload: UserStoriesGenerateRequest,
    current_user: CurrentUser,
    session: DbSession,
) -> Any:
    """Generate INVEST-compliant traceable User Stories from ingested requirements."""
    project = await verify_project_access(project_id, current_user, session, "artifacts:generate")
    try:
        artifact = await ArtifactGeneratorService.generate_user_stories(
            session=session,
            project=project,
            user=current_user,
            requirement_ids=payload.requirement_ids,
            query=payload.query,
            title=payload.title,
            client_ip=get_client_ip(request),
        )
        return await _load_artifact_detail(session, artifact.id)
    except LLMError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.post("/generate/acceptance-criteria", response_model=ArtifactDetailRead, status_code=status.HTTP_201_CREATED)
async def generate_acceptance_criteria(
    request: Request,
    project_id: uuid.UUID,
    payload: AcceptanceCriteriaGenerateRequest,
    current_user: CurrentUser,
    session: DbSession,
) -> Any:
    """Generate Given-When-Then Acceptance Criteria from ingested requirements."""
    project = await verify_project_access(project_id, current_user, session, "artifacts:generate")
    try:
        artifact = await ArtifactGeneratorService.generate_acceptance_criteria(
            session=session,
            project=project,
            user=current_user,
            requirement_ids=payload.requirement_ids,
            query=payload.query,
            title=payload.title,
            client_ip=get_client_ip(request),
        )
        return await _load_artifact_detail(session, artifact.id)
    except LLMError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.post("/generate/test-cases", response_model=ArtifactDetailRead, status_code=status.HTTP_201_CREATED)
async def generate_test_cases(
    request: Request,
    project_id: uuid.UUID,
    payload: TestCasesGenerateRequest,
    current_user: CurrentUser,
    session: DbSession,
) -> Any:
    """Generate functional, security, and boundary Test Cases conforming to ISO 29119."""
    project = await verify_project_access(project_id, current_user, session, "artifacts:generate")
    try:
        artifact = await ArtifactGeneratorService.generate_test_cases(
            session=session,
            project=project,
            user=current_user,
            requirement_ids=payload.requirement_ids,
            query=payload.query,
            title=payload.title,
            client_ip=get_client_ip(request),
        )
        return await _load_artifact_detail(session, artifact.id)
    except LLMError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.post("/generate/api-spec", response_model=ArtifactDetailRead, status_code=status.HTTP_201_CREATED)
async def generate_api_spec(
    request: Request,
    project_id: uuid.UUID,
    payload: ApiSpecGenerateRequest,
    current_user: CurrentUser,
    session: DbSession,
) -> Any:
    """Generate production-ready OpenAPI 3.1.0 JSON specification from requirements."""
    project = await verify_project_access(project_id, current_user, session, "artifacts:generate")
    try:
        artifact = await ArtifactGeneratorService.generate_api_spec(
            session=session,
            project=project,
            user=current_user,
            requirement_ids=payload.requirement_ids,
            query=payload.query,
            title=payload.title,
            client_ip=get_client_ip(request),
        )
        return await _load_artifact_detail(session, artifact.id)
    except LLMError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.post("/generate", response_model=ArtifactDetailRead, status_code=status.HTTP_201_CREATED)
async def generate_unified_artifact(
    request: Request,
    project_id: uuid.UUID,
    payload: UnifiedGenerateRequest,
    current_user: CurrentUser,
    session: DbSession,
) -> Any:
    """Unified generation endpoint supporting all artifact types with optional semantic RAG query."""
    project = await verify_project_access(project_id, current_user, session, "artifacts:generate")
    try:
        if payload.artifact_type == ArtifactType.user_stories:
            artifact = await ArtifactGeneratorService.generate_user_stories(
                session=session, project=project, user=current_user,
                requirement_ids=payload.requirement_ids, query=payload.query,
                title=payload.title, client_ip=get_client_ip(request),
            )
        elif payload.artifact_type == ArtifactType.acceptance_criteria:
            artifact = await ArtifactGeneratorService.generate_acceptance_criteria(
                session=session, project=project, user=current_user,
                requirement_ids=payload.requirement_ids, query=payload.query,
                title=payload.title, client_ip=get_client_ip(request),
            )
        elif payload.artifact_type == ArtifactType.test_cases:
            artifact = await ArtifactGeneratorService.generate_test_cases(
                session=session, project=project, user=current_user,
                requirement_ids=payload.requirement_ids, query=payload.query,
                title=payload.title, client_ip=get_client_ip(request),
            )
        elif payload.artifact_type == ArtifactType.api_specification:
            artifact = await ArtifactGeneratorService.generate_api_spec(
                session=session, project=project, user=current_user,
                requirement_ids=payload.requirement_ids, query=payload.query,
                title=payload.title, client_ip=get_client_ip(request),
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported artifact generation type: {payload.artifact_type}",
            )
        return await _load_artifact_detail(session, artifact.id)
    except LLMError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Artifact Lifecycle & Versioning Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=ArtifactRead, status_code=status.HTTP_201_CREATED)
async def create_artifact(
    request: Request,
    project_id: uuid.UUID,
    artifact_data: ArtifactCreate,
    current_user: CurrentUser,
    session: DbSession,
) -> Artifact:
    """Manually create an artifact under a project."""
    await verify_project_access(project_id, current_user, session, "artifacts:generate")

    artifact = Artifact(
        id=uuid.uuid4(),
        project_id=project_id,
        artifact_type=artifact_data.artifact_type,
        title=artifact_data.title,
        status=ReviewStatus.draft,
        created_by=current_user.id,
    )
    session.add(artifact)
    await session.flush()

    session.add(
        ArtifactVersion(
            id=uuid.uuid4(),
            artifact_id=artifact.id,
            version_number=1,
            payload=artifact_data.payload,
            source_requirement_ids=[str(v) for v in artifact_data.source_requirement_ids],
            created_by=current_user.id,
        )
    )

    await record_audit_log(
        session=session,
        action="ARTIFACT_CREATED",
        user_id=current_user.id,
        entity_type="artifact",
        entity_id=str(artifact.id),
        entity_title=artifact.title,
        ip_address=get_client_ip(request),
        details={"project_id": str(project_id), "artifact_type": artifact.artifact_type.value},
    )

    await session.commit()
    await session.refresh(artifact)
    return artifact


@router.get("", response_model=list[ArtifactRead])
async def list_artifacts(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    artifact_type: ArtifactType | None = Query(default=None, description="Filter by artifact type"),
    review_status: ReviewStatus | None = Query(default=None, description="Filter by review status"),
) -> list[Artifact]:
    """List all artifacts for project with project-scoped authorization."""
    await verify_project_access(project_id, current_user, session, "artifacts:view")

    stmt = select(Artifact).where(Artifact.project_id == project_id)
    if artifact_type:
        stmt = stmt.where(Artifact.artifact_type == artifact_type)
    if review_status:
        stmt = stmt.where(Artifact.status == review_status)

    result = await session.execute(stmt.order_by(Artifact.created_at.desc()))
    return list(result.scalars().all())


@router.get("/{artifact_id}", response_model=ArtifactDetailRead)
async def get_artifact(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> ArtifactDetailRead:
    """Retrieve artifact details including all historical versions."""
    await verify_project_access(project_id, current_user, session, "artifacts:view")
    return await _load_artifact_detail(session, artifact_id, project_id=project_id)


@router.get("/{artifact_id}/versions", response_model=list[ArtifactVersionRead])
async def list_artifact_versions(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> list[ArtifactVersion]:
    """List all historical versions of an artifact."""
    await verify_project_access(project_id, current_user, session, "artifacts:view")
    stmt = (
        select(ArtifactVersion)
        .where(ArtifactVersion.artifact_id == artifact_id)
        .order_by(ArtifactVersion.version_number.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.post("/{artifact_id}/versions", response_model=ArtifactVersionRead, status_code=status.HTTP_201_CREATED)
async def create_artifact_version(
    request: Request,
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: ArtifactVersionCreate,
    current_user: CurrentUser,
    session: DbSession,
) -> ArtifactVersion:
    """Create a new incremented version for an existing artifact."""
    await verify_project_access(project_id, current_user, session, "artifacts:generate")

    # Fetch artifact
    res = await session.execute(
        select(Artifact).where(Artifact.id == artifact_id, Artifact.project_id == project_id)
    )
    artifact = res.scalar_one_or_none()
    if not artifact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact not found.")

    # Determine next version number
    v_res = await session.execute(
        select(func.coalesce(func.max(ArtifactVersion.version_number), 0)).where(
            ArtifactVersion.artifact_id == artifact_id
        )
    )
    next_version = (v_res.scalar() or 0) + 1

    new_version = ArtifactVersion(
        id=uuid.uuid4(),
        artifact_id=artifact_id,
        version_number=next_version,
        payload=payload.payload,
        source_requirement_ids=[str(r) for r in payload.source_requirement_ids],
        created_by=current_user.id,
    )
    session.add(new_version)

    await record_audit_log(
        session=session,
        action="ARTIFACT_VERSION_CREATED",
        user_id=current_user.id,
        entity_type="artifact_version",
        entity_id=str(new_version.id),
        entity_title=f"{artifact.title} v{next_version}",
        ip_address=get_client_ip(request),
        details={"artifact_id": str(artifact_id), "version": next_version},
    )

    await session.commit()
    await session.refresh(new_version)
    return new_version


@router.patch("/{artifact_id}/status", response_model=ArtifactRead)
async def update_artifact_status(
    request: Request,
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: ArtifactStatusUpdate,
    current_user: CurrentUser,
    session: DbSession,
) -> Artifact:
    """Update review status of an artifact (draft -> in_review -> accepted/rejected)."""
    await verify_project_access(project_id, current_user, session, "artifacts:review")

    res = await session.execute(
        select(Artifact).where(Artifact.id == artifact_id, Artifact.project_id == project_id)
    )
    artifact = res.scalar_one_or_none()
    if not artifact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact not found.")

    old_status = artifact.status
    artifact.status = payload.status

    await record_audit_log(
        session=session,
        action="ARTIFACT_STATUS_UPDATED",
        user_id=current_user.id,
        entity_type="artifact",
        entity_id=str(artifact.id),
        entity_title=artifact.title,
        ip_address=get_client_ip(request),
        details={"old_status": old_status.value, "new_status": payload.status.value},
    )

    await session.commit()
    await session.refresh(artifact)
    return artifact


# ---------------------------------------------------------------------------
# Internal Helpers
# ---------------------------------------------------------------------------

async def _load_artifact_detail(
    session: AsyncSession, artifact_id: uuid.UUID, project_id: uuid.UUID | None = None
) -> ArtifactDetailRead:
    stmt = (
        select(Artifact)
        .options(selectinload(Artifact.versions))
        .where(Artifact.id == artifact_id)
    )
    if project_id:
        stmt = stmt.where(Artifact.project_id == project_id)

    res = await session.execute(stmt)
    artifact = res.scalar_one_or_none()
    if not artifact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact not found.")

    sorted_versions = sorted(artifact.versions, key=lambda v: v.version_number, reverse=True)
    current_version = sorted_versions[0] if sorted_versions else None

    return ArtifactDetailRead(
        id=artifact.id,
        project_id=artifact.project_id,
        artifact_type=artifact.artifact_type,
        title=artifact.title,
        status=artifact.status,
        created_by=artifact.created_by,
        created_at=artifact.created_at,
        updated_at=artifact.updated_at,
        versions=[ArtifactVersionRead.model_validate(v) for v in sorted_versions],
        current_version=ArtifactVersionRead.model_validate(current_version) if current_version else None,
    )
