from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DbSession, CurrentUser, require_capability
from app.models import AuditLog, User
from app.schemas import AuditLogRead

router = APIRouter(prefix="/audit-logs", tags=["Audit & Governance"])


@router.get("", response_model=list[AuditLogRead])
async def list_audit_logs(
    session: DbSession,
    user: Annotated[User, Depends(require_capability("audit:view"))],
    action: str | None = Query(default=None, description="Filter by action name"),
    entity_type: str | None = Query(default=None, description="Filter by entity type"),
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[AuditLog]:
    """Retrieve immutable security and governance audit trail (UC-13)."""
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)

    stmt = stmt.limit(limit).offset(offset)
    result = await session.execute(stmt)
    return list(result.scalars().all())
