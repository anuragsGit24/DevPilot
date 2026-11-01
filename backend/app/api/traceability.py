"""Traceability matrix REST endpoints (Engineer 4, UC-08)."""
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, get_client_ip, verify_project_access
from app.core.audit import record_audit_log
from app.models import Artifact, ArtifactVersion, Requirement
from app.schemas import TraceabilityMatrixResponse
from app.traceability.matrix import matrix_from_artifact_rows

router = APIRouter(prefix="/projects/{project_id}/traceability", tags=["traceability"])


@router.get("/matrix", response_model=TraceabilityMatrixResponse)
async def get_traceability_matrix(
    request: Request,
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> TraceabilityMatrixResponse:
    await verify_project_access(project_id, current_user, session, "requirements:view")

    requirements = list(
        (await session.execute(
            select(Requirement)
            .where(Requirement.project_id == project_id)
            .order_by(Requirement.requirement_key)
        )).scalars().all()
    )
    versions = list(
        (await session.execute(
            select(ArtifactVersion)
            .join(Artifact, Artifact.id == ArtifactVersion.artifact_id)
            .where(Artifact.project_id == project_id)
            .options(selectinload(ArtifactVersion.artifact))
            .order_by(ArtifactVersion.version_number)
        )).scalars().all()
    )
    if not requirements:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No requirements ingested yet; upload requirements before generating a traceability matrix.",
        )

    matrix, version_numbers = matrix_from_artifact_rows(requirements, versions)

    await record_audit_log(
        session,
        action="TRACEABILITY_MATRIX_VIEWED",
        user_id=current_user.id,
        entity_type="project",
        entity_id=str(project_id),
        ip_address=get_client_ip(request),
        details={
            "requirements": matrix.requirements_total,
            "covered": matrix.requirements_covered,
            "gaps": len(matrix.gaps),
        },
    )
    await session.commit()
    return TraceabilityMatrixResponse(
        project_id=project_id,
        computed_at=datetime.now(UTC),
        latest_version_numbers=version_numbers,
        **matrix.model_dump(),
    )
