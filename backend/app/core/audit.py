import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog

logger = logging.getLogger("devpilot.audit")


async def record_audit_log(
    session: AsyncSession,
    action: str,
    user_id: uuid.UUID | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    entity_title: str | None = None,
    ip_address: str | None = None,
    details: dict[str, Any] | None = None,
) -> AuditLog:
    """Record an audit trail event for security, compliance, and governance (UC-13)."""
    # Sanitize details to never leak passwords, tokens, or private secrets in audit logs
    sanitized_details = None
    if details:
        sanitized_details = {}
        for k, v in details.items():
            if any(secret_term in k.lower() for secret_term in ["password", "token", "secret", "authorization"]):
                sanitized_details[k] = "[REDACTED]"
            else:
                sanitized_details[k] = v

    log_entry = AuditLog(
        id=uuid.uuid4(),
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        entity_title=entity_title,
        ip_address=ip_address,
        details=sanitized_details,
    )
    session.add(log_entry)
    # Log structured message for log sinks (Cloud Logging / Stackdriver)
    logger.info(
        "AUDIT: action=%s user_id=%s entity_type=%s entity_id=%s ip=%s",
        action,
        user_id,
        entity_type,
        entity_id,
        ip_address,
    )
    return log_entry
