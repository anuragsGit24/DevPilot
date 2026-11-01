"""Evaluation REST endpoints (Engineer 4, UC-08/SC-2)."""
import uuid

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, get_client_ip, verify_project_access
from app.core.audit import record_audit_log
from app.evaluations.service import EmptyProjectError, run_project_evaluation
from app.models import Evaluation
from app.schemas import EvaluationRead

router = APIRouter(prefix="/projects/{project_id}/evaluations", tags=["evaluations"])


@router.post("/run", response_model=EvaluationRead, status_code=status.HTTP_201_CREATED)
async def run_evaluation(
    request: Request,
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> Evaluation:
    await verify_project_access(project_id, current_user, session, "evaluations:run")
    try:
        evaluation = await run_project_evaluation(
            session, project_id, current_user, triggered_by="api"
        )
    except EmptyProjectError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    return evaluation


@router.get("", response_model=list[EvaluationRead])
async def list_evaluations(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    limit: int = 20,
    offset: int = 0,
) -> list[Evaluation]:
    await verify_project_access(project_id, current_user, session, "evaluations:view")
    limit = max(1, min(limit, 100))
    offset = max(offset, 0)
    result = await session.execute(
        select(Evaluation)
        .where(Evaluation.project_id == project_id)
        .order_by(Evaluation.created_at.desc(), Evaluation.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


@router.get("/{evaluation_id}", response_model=EvaluationRead)
async def get_evaluation(
    request: Request,
    project_id: uuid.UUID,
    evaluation_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> Evaluation:
    await verify_project_access(project_id, current_user, session, "evaluations:view")
    result = await session.execute(
        select(Evaluation).where(
            Evaluation.project_id == project_id,
            Evaluation.id == evaluation_id,
        )
    )
    evaluation = result.scalar_one_or_none()
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evaluation '{evaluation_id}' was not found for this project.",
        )
    await record_audit_log(
        session,
        action="EVALUATION_VIEWED",
        user_id=current_user.id,
        entity_type="evaluation",
        entity_id=str(evaluation_id),
        ip_address=get_client_ip(request),
        details={"project_id": str(project_id)},
    )
    await session.commit()
    return evaluation
