import uuid

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, DbSession, get_client_ip, verify_project_access
from app.core.audit import record_audit_log
from app.models import Artifact, ArtifactVersion
from app.schemas import ArtifactCreate, ArtifactRead

router = APIRouter(prefix="/projects/{project_id}/artifacts", tags=["artifacts"])


@router.post("", response_model=ArtifactRead, status_code=status.HTTP_201_CREATED)
async def create_artifact(
    request: Request,
    project_id: uuid.UUID,
    artifact_data: ArtifactCreate,
    current_user: CurrentUser,
    session: DbSession,
) -> Artifact:
    """Create a new artifact under a project with project-scoped authorization."""
    await verify_project_access(project_id, current_user, session, "artifacts:generate")

    artifact = Artifact(
        id=uuid.uuid4(),
        project_id=project_id,
        artifact_type=artifact_data.artifact_type,
        title=artifact_data.title,
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
            source_requirement_ids=[str(value) for value in artifact_data.source_requirement_ids],
            created_by=current_user.id,
        )
    )

    await record_audit_log(
        session=session,
        action="ARTIFACT_GENERATED",
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
) -> list[Artifact]:
    """List artifacts for project with project-scoped authorization."""
    await verify_project_access(project_id, current_user, session, "artifacts:view")

    result = await session.execute(
        select(Artifact)
        .where(Artifact.project_id == project_id)
        .order_by(Artifact.created_at.desc())
    )
    return list(result.scalars().all())
