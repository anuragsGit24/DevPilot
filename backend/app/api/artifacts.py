import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import db_session
from app.models import Artifact, ArtifactVersion
from app.schemas import ArtifactCreate, ArtifactRead

router = APIRouter(prefix="/projects/{project_id}/artifacts", tags=["artifacts"])
DbSession = Annotated[AsyncSession, Depends(db_session)]


@router.post("", response_model=ArtifactRead, status_code=status.HTTP_201_CREATED)
async def create_artifact(
    project_id: uuid.UUID,
    artifact_data: ArtifactCreate,
    session: DbSession,
) -> Artifact:
    artifact = Artifact(
        project_id=project_id,
        artifact_type=artifact_data.artifact_type,
        title=artifact_data.title,
        created_by=artifact_data.created_by,
    )
    session.add(artifact)
    await session.flush()
    session.add(
        ArtifactVersion(
            artifact_id=artifact.id,
            version_number=1,
            payload=artifact_data.payload,
            source_requirement_ids=[str(value) for value in artifact_data.source_requirement_ids],
            created_by=artifact_data.created_by,
        )
    )
    await session.commit()
    await session.refresh(artifact)
    return artifact


@router.get("", response_model=list[ArtifactRead])
async def list_artifacts(
    project_id: uuid.UUID,
    session: DbSession,
) -> list[Artifact]:
    result = await session.scalars(
        select(Artifact)
        .where(Artifact.project_id == project_id)
        .order_by(Artifact.created_at.desc())
    )
    return list(result)
