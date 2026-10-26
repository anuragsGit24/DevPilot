import asyncio
from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db import get_db_session
from app.main import app
from app.models import Base

# In-memory async SQLite engine for rapid, zero-dependency isolated automated testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionFactory = async_sessionmaker(test_engine, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
async def setup_test_database():
    """Create all tables in fresh SQLite database before each test and drop them after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    """Yield an independent session for test assertions."""
    async with TestSessionFactory() as session:
        yield session


@pytest.fixture
async def async_client() -> AsyncIterator[AsyncClient]:
    """Async HTTP test client with database dependency override."""
    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with TestSessionFactory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    app.dependency_overrides.clear()
