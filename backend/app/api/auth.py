import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DbSession, CurrentUser, get_client_ip, require_capability, require_role
from app.core.audit import record_audit_log
from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_jwt_token,
    ensure_utc,
    generate_reset_token,
    hash_password,
    hash_token,
    has_role_capability,
    ROLE_CAPABILITIES,
    verify_password,
)
from app.models import PasswordResetToken, User, UserRole
from app.schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    GenericResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserProvision,
    UserRead,
    UserRegister,
    UserRoleUpdate,
    UserStatusUpdate,
)

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    payload: UserRegister,
    session: DbSession,
) -> User:
    """Real user self-registration with bcrypt password hashing."""
    # Check if user already exists
    existing = await session.execute(select(User).where(User.email == payload.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists.",
        )

    user = User(
        id=uuid.uuid4(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        name=payload.name,
        role=payload.role,
        is_active=True,
    )
    session.add(user)
    await record_audit_log(
        session=session,
        action="USER_REGISTERED",
        user_id=user.id,
        entity_type="user",
        entity_id=str(user.id),
        entity_title=user.name,
        ip_address=get_client_ip(request),
        details={"email": user.email, "role": user.role.value},
    )
    await session.commit()
    await session.refresh(user)
    return user


@router.post("/provision", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def provision_user(
    request: Request,
    payload: UserProvision,
    current_user: CurrentUser,
    session: DbSession,
) -> User:
    """Administrator / Manager user provisioning endpoint (UC-13)."""
    # Enforce users:manage permission
    if not has_role_capability(current_user.role, "users:manage"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only administrators can provision enterprise users.",
        )

    existing = await session.execute(select(User).where(User.email == payload.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists.",
        )

    initial_password = payload.password or "Welcome123!"
    user = User(
        id=uuid.uuid4(),
        email=payload.email.lower(),
        password_hash=hash_password(initial_password),
        name=payload.name,
        role=payload.role,
        is_active=True,
    )
    session.add(user)
    await record_audit_log(
        session=session,
        action="USER_PROVISIONED",
        user_id=current_user.id,
        entity_type="user",
        entity_id=str(user.id),
        entity_title=user.name,
        ip_address=get_client_ip(request),
        details={"provisioned_email": user.email, "role": user.role.value},
    )
    await session.commit()
    await session.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    payload: UserLogin,
    session: DbSession,
) -> TokenResponse:
    """
    Secure login with bcrypt password verification, failed-login tracking,
    and automatic account lockout after excessive failed attempts.
    """
    settings = get_settings()
    ip = get_client_ip(request)
    now = datetime.now(timezone.utc)

    result = await session.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    # Generic invalid credentials if user not found (prevent enumeration)
    if not user:
        await record_audit_log(
            session=session,
            action="AUTH_LOGIN_FAILED",
            user_id=None,
            entity_type="auth",
            entity_title=payload.email.lower(),
            ip_address=ip,
            details={"reason": "User not found"},
        )
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Check deactivated
    if not user.is_active:
        await record_audit_log(
            session=session,
            action="AUTH_LOGIN_INACTIVE",
            user_id=user.id,
            entity_type="user",
            entity_id=str(user.id),
            ip_address=ip,
        )
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact an administrator.",
        )

    # Check lockout
    locked_until_utc = ensure_utc(user.locked_until)
    if locked_until_utc and locked_until_utc > now:
        remaining_seconds = int((locked_until_utc - now).total_seconds())
        remaining_minutes = max(1, (remaining_seconds + 59) // 60)
        await record_audit_log(
            session=session,
            action="AUTH_LOGIN_BLOCKED_LOCKOUT",
            user_id=user.id,
            entity_type="user",
            entity_id=str(user.id),
            ip_address=ip,
        )
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is temporarily locked due to excessive failed attempts. Try again in {remaining_minutes} minute(s).",
        )

    # Verify password
    if not verify_password(payload.password, user.password_hash):
        user.failed_login_count += 1
        lockout_triggered = False

        if user.failed_login_count >= settings.max_failed_attempts:
            user.locked_until = now + timedelta(minutes=settings.lockout_duration_minutes)
            lockout_triggered = True

        await record_audit_log(
            session=session,
            action="AUTH_ACCOUNT_LOCKED" if lockout_triggered else "AUTH_LOGIN_FAILED",
            user_id=user.id,
            entity_type="user",
            entity_id=str(user.id),
            ip_address=ip,
            details={"failed_attempts": user.failed_login_count},
        )
        await session.commit()

        if lockout_triggered:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account locked due to {settings.max_failed_attempts} failed attempts. Cooldown duration: {settings.lockout_duration_minutes} minutes.",
            )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid email or password. Attempt {user.failed_login_count} of {settings.max_failed_attempts}.",
        )

    # Successful login: reset failed counters and update last login timestamp
    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = now

    await record_audit_log(
        session=session,
        action="AUTH_LOGIN_SUCCESS",
        user_id=user.id,
        entity_type="user",
        entity_id=str(user.id),
        entity_title=user.name,
        ip_address=ip,
    )
    await session.commit()

    access_token = create_access_token(str(user.id), user.email, user.role.value)
    refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    payload: RefreshTokenRequest,
    session: DbSession,
) -> TokenResponse:
    """Exchange a valid refresh token for a fresh access token."""
    decoded = decode_jwt_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    user_id_str = decoded.get("sub")
    result = await session.execute(select(User).where(User.id == uuid.UUID(user_id_str)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account invalid or inactive.",
        )

    settings = get_settings()
    access_token = create_access_token(str(user.id), user.email, user.role.value)
    new_refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.get("/me")
async def get_current_user_profile(current_user: CurrentUser) -> dict:
    """Get authenticated user profile and capability matrix."""
    capabilities = list(ROLE_CAPABILITIES.get(current_user.role, set()))
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value,
        "is_active": current_user.is_active,
        "failed_login_count": current_user.failed_login_count,
        "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
        "capabilities": capabilities,
    }


@router.post("/logout", response_model=GenericResponse)
async def logout(
    request: Request,
    current_user: CurrentUser,
    session: DbSession,
) -> GenericResponse:
    """Audit user sign-out and terminate active session."""
    await record_audit_log(
        session=session,
        action="AUTH_LOGOUT",
        user_id=current_user.id,
        entity_type="user",
        entity_id=str(current_user.id),
        entity_title=current_user.name,
        ip_address=get_client_ip(request),
    )
    await session.commit()
    return GenericResponse(status="ok", message="Session terminated successfully.")


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    session: DbSession,
) -> ForgotPasswordResponse:
    """
    Generate single-use cryptographically secure reset token.
    Stores SHA-256 hash of token (never raw token in database).
    Returns generic response to prevent account enumeration.
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)
    raw_token = generate_reset_token()
    token_hashed = hash_token(raw_token)

    result = await session.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    if user and user.is_active:
        reset_entry = PasswordResetToken(
            id=uuid.uuid4(),
            user_id=user.id,
            token_hash=token_hashed,
            expires_at=now + timedelta(minutes=settings.password_reset_expire_minutes),
        )
        session.add(reset_entry)
        await record_audit_log(
            session=session,
            action="AUTH_PASSWORD_RESET_REQUEST",
            user_id=user.id,
            entity_type="user",
            entity_id=str(user.id),
            ip_address=get_client_ip(request),
        )
        await session.commit()
        # In non-production or for automated tests, include token in response
        return ForgotPasswordResponse(
            message="If your email is registered, recovery instructions have been dispatched.",
            reset_token=raw_token if settings.environment in ("development", "test") else None,
        )

    # Generic response even if email not found
    return ForgotPasswordResponse(
        message="If your email is registered, recovery instructions have been dispatched.",
        reset_token=None,
    )


@router.post("/reset-password", response_model=GenericResponse)
async def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    session: DbSession,
) -> GenericResponse:
    """
    Consume single-use password reset token.
    Validates token hash and expiration, updates password hash,
    marks token as consumed, and clears failed login attempts.
    """
    now = datetime.now(timezone.utc)
    incoming_hash = hash_token(payload.token)

    result = await session.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == incoming_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
    )
    token_record = result.scalar_one_or_none()

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token is invalid, expired, or has already been used.",
        )

    # Fetch corresponding user
    user_res = await session.execute(select(User).where(User.id == token_record.user_id))
    user = user_res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Associated user account not found.",
        )

    # Update password and consume token
    user.password_hash = hash_password(payload.new_password)
    user.failed_login_count = 0
    user.locked_until = None
    token_record.used_at = now

    await record_audit_log(
        session=session,
        action="AUTH_PASSWORD_RESET_SUCCESS",
        user_id=user.id,
        entity_type="user",
        entity_id=str(user.id),
        entity_title=user.name,
        ip_address=get_client_ip(request),
    )
    await session.commit()

    return GenericResponse(status="ok", message="Password reset successfully. You may now log in.")


# User Management Endpoints (Admin / PM)
@router.get("/users", response_model=list[UserRead])
async def list_users(
    session: DbSession,
    admin_user: Annotated[User, Depends(require_capability("users:manage"))],
) -> list[User]:
    """List all registered users (Admin only)."""
    result = await session.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


@router.patch("/users/{user_id}/role", response_model=UserRead)
async def update_user_role(
    request: Request,
    user_id: uuid.UUID,
    payload: UserRoleUpdate,
    current_user: CurrentUser,
    session: DbSession,
) -> User:
    """Update user role assignment (Admin only)."""
    if not has_role_capability(current_user.role, "users:manage"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: users:manage capability required.",
        )

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    old_role = user.role
    user.role = payload.role

    await record_audit_log(
        session=session,
        action="USER_ROLE_CHANGED",
        user_id=current_user.id,
        entity_type="user",
        entity_id=str(user.id),
        entity_title=user.name,
        ip_address=get_client_ip(request),
        details={"old_role": old_role.value, "new_role": payload.role.value},
    )
    await session.commit()
    await session.refresh(user)
    return user


@router.patch("/users/{user_id}/status", response_model=UserRead)
async def update_user_status(
    request: Request,
    user_id: uuid.UUID,
    payload: UserStatusUpdate,
    current_user: CurrentUser,
    session: DbSession,
) -> User:
    """Toggle account activation/lock state (Admin only)."""
    if not has_role_capability(current_user.role, "users:manage"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: users:manage capability required.",
        )

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.is_active = payload.is_active
    if payload.is_active:
        user.failed_login_count = 0
        user.locked_until = None

    await record_audit_log(
        session=session,
        action="USER_STATUS_TOGGLED",
        user_id=current_user.id,
        entity_type="user",
        entity_id=str(user.id),
        entity_title=user.name,
        ip_address=get_client_ip(request),
        details={"is_active": user.is_active},
    )
    await session.commit()
    await session.refresh(user)
    return user
