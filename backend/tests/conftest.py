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


# ─────────────────────────────────────────────────────────────────────────────────
# Engineer 4 (Phase P5) shared fixtures: users, project, requirements
# ─────────────────────────────────────────────────────────────────────────────────


from e4_helpers import (
    DEMO_REQUIREMENTS,
    make_requirement,
    make_user,
)

from app.core.security import create_access_token
from app.models import ProjectMember, UserRole


@pytest.fixture
async def e4_users_and_projects(db_session: AsyncSession) -> dict:
    """Admin, a PM member of a demo project, and a non-member developer."""
    admin = make_user("e4-admin@devpilot.test.local", "E4 Admin", UserRole.admin)
    pm = make_user("e4-pm@devpilot.test.local", "E4 PM", UserRole.project_manager)
    outsider = make_user("e4-outsider@devpilot.test.local", "E4 Outsider", UserRole.developer)
    db_session.add_all([admin, pm, outsider])
    await db_session.flush()

    from e4_helpers import make_project as _make_project

    project = _make_project("E4 Evaluation Project", "Retail banking portal", admin.id)
    db_session.add(project)
    await db_session.flush()

    member = ProjectMember(project_id=project.id, user_id=pm.id, role=UserRole.project_manager)
    db_session.add(member)

    requirements = [
        make_requirement(project.id, pm.id, key, title, description)
        for key, title, description in DEMO_REQUIREMENTS
    ]
    db_session.add_all(requirements)
    await db_session.commit()

    admin_token = create_access_token(str(admin.id), admin.email, admin.role.value)
    pm_token = create_access_token(str(pm.id), pm.email, pm.role.value)
    outsider_token = create_access_token(str(outsider.id), outsider.email, outsider.role.value)
    return {
        "admin": admin,
        "pm": pm,
        "outsider": outsider,
        "project": project,
        "requirements": requirements,
        "admin_token": admin_token,
        "pm_token": pm_token,
        "outsider_token": outsider_token,
        "admin_headers": {"Authorization": f"Bearer {admin_token}"},
        "pm_headers": {"Authorization": f"Bearer {pm_token}"},
        "outsider_headers": {"Authorization": f"Bearer {outsider_token}"},
    }
