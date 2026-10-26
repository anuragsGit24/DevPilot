import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

from app.core.config import get_settings
from app.models import UserRole

# RBAC capability mapping matching docs/features/AUTHENTICATION_AND_RBAC.md
ROLE_CAPABILITIES: dict[UserRole, set[str]] = {
    UserRole.admin: {
        "users:manage",
        "system:configure",
        "audit:view",
        "projects:create",
        "projects:manage",
        "projects:view",
        "requirements:ingest",
        "requirements:edit",
        "requirements:view",
        "artifacts:generate",
        "artifacts:review",
        "artifacts:view",
        "prompts:manage",
        "prompts:activate",
        "prompts:view",
        "evaluations:run",
        "evaluations:review",
        "evaluations:view",
        "dashboard:view",
        "exports:create",
        "assistant:use",
        "sprints:manage",
        "sprints:view",
    },
    UserRole.project_manager: {
        "projects:create",
        "projects:manage",
        "projects:view",
        "requirements:ingest",
        "requirements:edit",
        "requirements:view",
        "artifacts:generate",
        "artifacts:review",
        "artifacts:view",
        "prompts:view",
        "evaluations:run",
        "evaluations:review",
        "evaluations:view",
        "dashboard:view",
        "exports:create",
        "assistant:use",
        "sprints:manage",
        "sprints:view",
    },
    UserRole.business_analyst: {
        "projects:view",
        "requirements:ingest",
        "requirements:edit",
        "requirements:view",
        "artifacts:generate",
        "artifacts:review",
        "artifacts:view",
        "prompts:view",
        "evaluations:run",
        "evaluations:review",
        "evaluations:view",
        "dashboard:view",
        "exports:create",
        "assistant:use",
        "sprints:view",
    },
    UserRole.developer: {
        "projects:view",
        "requirements:view",
        "artifacts:generate",
        "artifacts:review",
        "artifacts:view",
        "prompts:view",
        "evaluations:view",
        "dashboard:view",
        "exports:create",
        "assistant:use",
        "sprints:view",
    },
    UserRole.tester: {
        "projects:view",
        "requirements:view",
        "artifacts:generate",
        "artifacts:review",
        "artifacts:view",
        "prompts:view",
        "evaluations:run",
        "evaluations:review",
        "evaluations:view",
        "dashboard:view",
        "exports:create",
        "assistant:use",
        "sprints:view",
    },
}


def ensure_utc(dt: datetime | None) -> datetime | None:
    """Ensure datetime is UTC-aware even when retrieved from SQLite or legacy databases."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def hash_password(password: str) -> str:
    """Hash password using bcrypt with salt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def create_jwt_token(
    data: dict[str, Any],
    expires_delta: timedelta,
    token_type: str = "access"
) -> str:
    """Create signed JWT token."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    to_encode = data.copy()
    to_encode.update({
        "exp": now + expires_delta,
        "iat": now,
        "type": token_type,
    })
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: str, email: str, role: str) -> str:
    """Create access token with user claims."""
    settings = get_settings()
    delta = timedelta(minutes=settings.access_token_expire_minutes)
    return create_jwt_token(
        {"sub": str(user_id), "email": email, "role": role},
        expires_delta=delta,
        token_type="access"
    )


def create_refresh_token(user_id: str) -> str:
    """Create refresh token."""
    settings = get_settings()
    delta = timedelta(days=settings.refresh_token_expire_days)
    return create_jwt_token(
        {"sub": str(user_id)},
        expires_delta=delta,
        token_type="refresh"
    )


def decode_jwt_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a JWT token."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except (jwt.PyJWTError, Exception):
        return None


def generate_reset_token() -> str:
    """Generate high-entropy cryptographically secure random reset token."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Deterministic hash of secret token for database lookup and storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def has_role_capability(role: UserRole, capability: str) -> bool:
    """Check if given role possesses capability."""
    return capability in ROLE_CAPABILITIES.get(role, set())
