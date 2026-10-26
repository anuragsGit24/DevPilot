import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_jwt_token, ensure_utc, has_role_capability
from app.db import get_db_session
from app.models import Project, ProjectMember, User, UserRole

DbSession = Annotated[AsyncSession, Depends(get_db_session)]
security_scheme = HTTPBearer(auto_error=False)


async def db_session(session: DbSession) -> AsyncIterator[AsyncSession]:
    yield session


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, supporting proxies and Cloud Load Balancers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def get_current_user(
    request: Request,
    auth_header: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
    session: DbSession,
) -> User:
    """Validate Bearer JWT token and return authenticated User object."""
    if not auth_header or not auth_header.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_jwt_token(auth_header.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is expired or invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject identifier.",
        )

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identifier format.",
        )

    result = await session.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact an administrator.",
        )

    # Check if account is locked due to failed login attempts
    locked_until_utc = ensure_utc(user.locked_until)
    if locked_until_utc and locked_until_utc > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is temporarily locked until {locked_until_utc.isoformat()}.",
        )

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_capability(capability: str):
    """Enforce fine-grained RBAC capability on endpoint."""
    async def _capability_verifier(user: CurrentUser) -> User:
        if not has_role_capability(user.role, capability):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: current role '{user.role.value}' lacks capability '{capability}'.",
            )
        return user

    return _capability_verifier


def require_role(*allowed_roles: UserRole):
    """Enforce specific enterprise roles on endpoint."""
    async def _role_verifier(user: CurrentUser) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: role '{user.role.value}' not authorized for this resource.",
            )
        return user

    return _role_verifier


async def verify_project_access(
    project_id: uuid.UUID,
    user: User,
    session: AsyncSession,
    required_capability: str = "projects:view",
) -> Project:
    """
    Enforces project-scoped permissions.
    Global Admins have access to all projects.
    Other users must be explicit members in project_members table.
    """
    # Fetch project
    result = await session.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found.",
        )

    # Admin has unrestricted system-wide access
    if user.role == UserRole.admin:
        return project

    # Check membership
    mem_res = await session.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
        )
    )
    membership = mem_res.scalar_one_or_none()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are not assigned as a member of this project.",
        )

    # Validate role capability within project
    if not has_role_capability(membership.role, required_capability):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Project role '{membership.role.value}' lacks capability '{required_capability}'.",
        )

    return project
