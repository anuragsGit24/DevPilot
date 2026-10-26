from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import db_session
from app.core.config import get_settings
from app.schemas import HealthResponse

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/live", response_model=HealthResponse)
async def liveness() -> HealthResponse:
    return HealthResponse(status="ok", service=get_settings().app_name, database="unknown")


@router.get("/ready", response_model=HealthResponse)
async def readiness(
    session: Annotated[AsyncSession, Depends(db_session)],
) -> HealthResponse:
    await session.execute(text("SELECT 1"))
    return HealthResponse(status="ok", service=get_settings().app_name, database="ok")
