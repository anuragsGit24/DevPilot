"""Shared fixtures and factories for Engineer 4 (P5) test suites."""
from __future__ import annotations

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.models import (
    Artifact,
    ArtifactType,
    ArtifactVersion,
    Project,
    ProjectMember,
    Requirement,
    User,
    UserRole,
)


def make_user(email: str, name: str, role: UserRole) -> User:
    return User(
        id=uuid.uuid4(),
        email=email,
        password_hash=hash_password("Pass123!"),
        name=name,
        role=role,
    )


def make_project(name: str, description: str, created_by: uuid.UUID) -> Project:
    return Project(id=uuid.uuid4(), name=name, description=description, created_by=created_by)


def make_requirement(
    project_id: uuid.UUID,
    created_by: uuid.UUID,
    requirement_key: str,
    title: str,
    description: str,
) -> Requirement:
    return Requirement(
        id=uuid.uuid4(),
        project_id=project_id,
        requirement_key=requirement_key,
        title=title,
        description=description,
        created_by=created_by,
    )


def make_artifact_version(
    project_id: uuid.UUID,
    created_by: uuid.UUID,
    artifact_type: ArtifactType,
    title: str,
    payload: dict,
    version_number: int = 1,
) -> ArtifactVersion:
    artifact = Artifact(
        id=uuid.uuid4(),
        project_id=project_id,
        artifact_type=artifact_type,
        title=title,
        created_by=created_by,
    )
    version = ArtifactVersion(
        id=uuid.uuid4(),
        artifact_id=artifact.id,
        version_number=version_number,
        payload=payload,
        created_by=created_by,
    )
    version.artifact = artifact
    return version


def fully_covered_artifacts(project_id: uuid.UUID, created_by: uuid.UUID) -> list[ArtifactVersion]:
    """Story + criteria + tests + spec artifacts covering REQ-001..REQ-003."""
    stories_payload = {
        "summary": "Story suite",
        "stories": [
            {"story_key": "US-001", "title": "Register account", "source_requirement_keys": ["REQ-001"]},
            {"story_key": "US-002", "title": "Encrypt passwords", "source_requirement_keys": ["REQ-002"]},
            {"story_key": "US-003", "title": "Fast dashboard", "source_requirement_keys": ["REQ-003"]},
        ],
    }
    criteria_payload = {
        "summary": "Criteria suite",
        "acceptance_criteria": [
            {"criteria_key": "AC-001", "story_key": "US-001", "source_requirement_keys": ["REQ-001"],
             "given": "a new customer", "when": "they register", "then": "the account exists"},
            {"criteria_key": "AC-002", "story_key": "US-002", "source_requirement_keys": ["REQ-002"],
             "given": "a password is stored", "when": "the database writes", "then": "the hash is encrypted"},
            {"criteria_key": "AC-003", "story_key": "US-003", "source_requirement_keys": ["REQ-003"],
             "given": "the dashboard is open", "when": "data loads", "then": "results appear in 2s"},
        ],
    }
    tests_payload = {
        "summary": "Test suite",
        "test_cases": [
            {"test_key": "TC-001", "title": "Valid registration", "source_requirement_keys": ["REQ-001", "REQ-002"],
             "steps": ["1. Post /accounts"], "expected_result": "201 Created"},
            {"test_key": "TC-002", "title": "Dashboard latency", "source_requirement_keys": ["REQ-003"],
             "steps": ["1. Open dashboard"], "expected_result": "Results within 2 seconds"},
        ],
    }
    spec_payload = {
        "openapi": "3.1.0",
        "paths": {
            "/accounts": {
                "post": {"summary": "Register an account", "responses": {"201": {"description": "Created"}}},
                "get": {"summary": "List accounts", "responses": {"200": {"description": "OK"}}},
            }
        },
        "x-source-requirement-keys": ["REQ-001"],
    }
    return [
        make_artifact_version(project_id, created_by, ArtifactType.user_stories, "Stories", stories_payload),
        make_artifact_version(project_id, created_by, ArtifactType.acceptance_criteria, "Criteria", criteria_payload),
        make_artifact_version(project_id, created_by, ArtifactType.test_cases, "Tests", tests_payload),
        make_artifact_version(project_id, created_by, ArtifactType.api_specification, "API Spec", spec_payload),
    ]


DEMO_REQUIREMENTS = [
    ("REQ-001", "Customer registration",
     "The system must allow customers to register an account with email and password."),
    ("REQ-002", "Password encryption",
     "The system shall encrypt passwords before storing them in the database."),
    ("REQ-003", "Dashboard performance",
     "The portal should render dashboard results within two seconds."),
]


@pytest.fixture
async def e4_users_and_projects(db_session: AsyncSession) -> dict:
    """Admin, a PM/project with demo requirements, and a non-member developer."""
    admin = make_user("e4-admin@devpilot.test", "E4 Admin", UserRole.admin)
    pm = make_user("e4-pm@devpilot.test", "E4 PM", UserRole.project_manager)
    outsider = make_user("e4-outsider@devpilot.test", "E4 Outsider", UserRole.developer)
    db_session.add_all([admin, pm, outsider])
    await db_session.flush()

    project = make_project("E4 Evaluation Project", "Retail banking portal", admin.id)
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

    return {
        "admin": admin,
        "pm": pm,
        "outsider": outsider,
        "project": project,
        "requirements": requirements,
        "admin_token": create_access_token(str(admin.id), admin.email, admin.role.value),
        "pm_token": create_access_token(str(pm.id), pm.email, pm.role.value),
        "outsider_token": create_access_token(str(outsider.id), outsider.email, outsider.role.value),
        "admin_headers": {"Authorization": f"Bearer {create_access_token(str(admin.id), admin.email, admin.role.value)}"},
        "pm_headers": {"Authorization": f"Bearer {create_access_token(str(pm.id), pm.email, pm.role.value)}"},
        "outsider_headers": {"Authorization": f"Bearer {create_access_token(str(outsider.id), outsider.email, outsider.role.value)}"},
    }
