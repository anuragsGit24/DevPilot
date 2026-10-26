from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db_session

DbSession = Annotated[AsyncSession, Depends(get_db_session)]


async def db_session(session: DbSession) -> AsyncIterator[AsyncSession]:
    yield session
