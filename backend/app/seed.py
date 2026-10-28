"""Idempotent local demo data seeding.

This module is intentionally separate from application startup so normal API
restarts and logins never create or reset user data.
"""
import asyncio
import uuid

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password, verify_password
from app.db import SessionFactory, engine
from app.models import Project, ProjectMember, User, UserRole, WorkItem

PERSONAS = (
    ("Eleanor Vance", "admin@devpilot.demo", UserRole.admin, "admin"),
    ("James Whitfield", "pm@devpilot.demo", UserRole.project_manager, "user"),
    ("Sarah Chen", "ba@devpilot.demo", UserRole.business_analyst, "user"),
    ("Marcus Rodriguez", "dev@devpilot.demo", UserRole.developer, "user"),
    ("Priya Sharma", "qa@devpilot.demo", UserRole.tester, "user"),
)

WORK_ITEMS = (
    ("document", "Retail Banking Requirements v2.0", "complete", {"filename": "retail-banking-requirements.md"}),
    ("requirement", "Biometric Authentication", "confirmed", {"category": "security", "priority": "must"}),
    ("requirement", "Real-time Fraud Alerts", "in_review", {"category": "functional", "priority": "must"}),
    ("requirement", "Graceful PIN Fallback", "extracted", {"category": "resilience", "priority": "should"}),
    ("user_story", "Biometric Login", "accepted", {
        "asA": "Retail banking customer", "iWant": "to authenticate with biometrics",
        "soThat": "I can securely access my account", "priority": "must",
        "storyPoints": 5, "sourceRequirementIds": ["REQ-001"], "history": [],
    }),
    ("user_story", "Fraud Alert Delivery", "in_review", {
        "asA": "Retail banking customer", "iWant": "to receive real-time fraud alerts",
        "soThat": "I can respond quickly to suspicious activity", "priority": "must",
        "storyPoints": 8, "sourceRequirementIds": ["REQ-002"], "history": [],
    }),
    ("user_story", "PIN Authentication Fallback", "draft", {
        "asA": "Retail banking customer", "iWant": "to use my PIN when biometrics fail",
        "soThat": "I am not locked out of my account", "priority": "should",
        "storyPoints": 3, "sourceRequirementIds": ["REQ-003"], "history": [],
    }),
    ("acceptance_criteria", "Biometric match succeeds", "accepted", {
        "format": "gherkin", "scenarios": [], "history": [],
    }),
    ("acceptance_criteria", "Fraud alert is delivered", "draft", {
        "format": "gherkin", "scenarios": [], "history": [],
    }),
    ("test_case", "Reject unregistered biometric", "accepted", {
        "category": "negative", "priority": "high", "preconditions": [],
        "steps": [{"stepNumber": 1, "action": "Submit an unregistered biometric", "expectedResult": "Access is denied"}],
        "expectedResult": "The user is prompted to use PIN fallback", "history": [],
    }),
    ("test_case", "Deliver fraud alert within SLA", "in_review", {
        "category": "performance", "priority": "high", "preconditions": [],
        "steps": [{"stepNumber": 1, "action": "Trigger a suspicious transaction", "expectedResult": "Alert is delivered"}],
        "expectedResult": "Alert arrives within the configured SLA", "history": [],
    }),
    ("api_specification", "Retail Banking API", "accepted", {
        "openApiVersion": "3.1.0", "description": "Synthetic retail banking API",
        "endpoints": [
            {"path": "/auth/biometric", "method": "POST", "summary": "Authenticate biometrically", "description": "Authenticate a customer", "tags": ["Authentication"], "authentication": False},
            {"path": "/alerts", "method": "GET", "summary": "List fraud alerts", "description": "List alerts for the current customer", "tags": ["Alerts"], "authentication": True},
        ],
    }),
    ("architecture", "Secure banking platform architecture", "in_review", {
        "pattern": "event-driven", "summary": "Event-driven services with layered security",
        "components": [], "decisions": [], "risks": [], "alternatives": [],
    }),
    ("sprint", "Sprint 1 - Secure login", "active", {
        "goal": "Deliver secure authentication", "capacityStoryPoints": 34,
        "totalPoints": 34, "completedPoints": 13, "allocatedStoryPoints": 13,
        "targetVelocity": 34, "userStoryIds": ["Biometric Login", "PIN Authentication Fallback"],
        "warnings": [],
    }),
    ("prompt", "User story generation prompt", "active", {
        "name": "User story generation prompt", "description": "Generates structured user stories from confirmed requirements.",
        "version": 1, "activeVersion": 1, "targetArtifact": "user_stories",
        "variables": ["requirements"], "versions": [{"versionNumber": 1, "status": "active", "variables": ["requirements"]}],
        "benchmarkScore": 86, "runs": 12,
    }),
    ("prompt", "Acceptance criteria prompt", "active", {
        "name": "Acceptance criteria prompt", "description": "Generates Gherkin acceptance criteria.",
        "version": 1, "activeVersion": 1, "targetArtifact": "acceptance_criteria",
        "variables": ["user_story"], "versions": [{"versionNumber": 1, "status": "active", "variables": ["user_story"]}],
        "benchmarkScore": 82, "runs": 9,
    }),
    ("evaluation", "Retail banking baseline evaluation", "complete", {
        "overallScore": 78.4, "metrics": {"accuracy": 78.4, "completeness": 81, "relevance": 79, "overallScore": 78.4},
    }),
    ("assistant_conversation", "Retail banking assistant conversation", "active", {
        "isDemo": True, "messages": [],
    }),
)


async def seed_demo() -> None:
    settings = get_settings()
    if settings.environment != "development":
        raise RuntimeError("Demo seeding is only permitted in development.")

    async with SessionFactory() as session:
        users: dict[str, User] = {}
        for name, email, role, password_kind in PERSONAS:
            password = (
                settings.demo_admin_password
                if password_kind == "admin"
                else settings.demo_user_password
            )
            result = await session.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if user is None:
                user = User(
                    id=uuid.uuid4(),
                    name=name,
                    email=email,
                    role=role,
                    password_hash=hash_password(password),
                    is_active=True,
                )
                session.add(user)
                await session.flush()
            elif not verify_password(password, user.password_hash):
                # The configured local demo password is authoritative for
                # seeded personas. Repair accounts created before .env was
                # wired into Compose without touching their demo project data.
                user.password_hash = hash_password(password)
                user.failed_login_count = 0
                user.locked_until = None
            users[email] = user

        admin = users["admin@devpilot.demo"]
        result = await session.execute(
            select(Project).where(Project.name == "Retail Banking Demo")
        )
        project = result.scalar_one_or_none()
        if project is None:
            project = Project(
                id=uuid.uuid4(),
                name="Retail Banking Demo",
                description="Synthetic demo project. Do not use for production data.",
                created_by=admin.id,
            )
            session.add(project)
            await session.flush()

        for _, email, role, _ in PERSONAS:
            result = await session.execute(
                select(ProjectMember).where(
                    ProjectMember.project_id == project.id,
                    ProjectMember.user_id == users[email].id,
                )
            )
            if result.scalar_one_or_none() is None:
                session.add(
                    ProjectMember(project_id=project.id, user_id=users[email].id, role=role)
                )

        for record_type, title, status, payload in WORK_ITEMS:
            seed_key = f"retail-banking-demo:{record_type}:{title}"
            result = await session.execute(
                select(WorkItem).where(
                    WorkItem.project_id == project.id,
                    WorkItem.payload["seed_key"].as_string() == seed_key,
                )
            )
            item = result.scalar_one_or_none()
            if item is None:
                session.add(
                    WorkItem(
                        project_id=project.id,
                        record_type=record_type,
                        title=title,
                        status=status,
                        payload={**payload, "seed_key": seed_key, "isDemo": True},
                        source_ids=[],
                        created_by=admin.id,
                    )
                )
            else:
                # Keep repeatable seeds useful when fixture fields evolve.
                # Existing user-created records are never selected because
                # they do not carry this seed key.
                item.title = title
                item.status = status
                item.payload = {
                    **item.payload,
                    **payload,
                    "seed_key": seed_key,
                    "isDemo": True,
                }
        await session.commit()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_demo())
