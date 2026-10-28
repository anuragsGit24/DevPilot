import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, DbSession, get_client_ip, require_capability, verify_project_access
from app.core.audit import record_audit_log
from app.models import Project, ProjectMember, User, UserRole
from app.schemas import ProjectCreate, ProjectMemberAdd, ProjectMemberRead, ProjectRead, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    request: Request,
    project_data: ProjectCreate,
    current_user: Annotated[User, Depends(require_capability("projects:create"))],
    session: DbSession,
) -> Project:
    """Create a new project workspace with creator assigned as primary member."""
    project = Project(
        id=uuid.uuid4(),
        name=project_data.name,
        description=project_data.description,
        created_by=current_user.id,
    )
    session.add(project)

    # Assign creator as project manager (or admin) in project_members
    member = ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role=current_user.role if current_user.role in (UserRole.admin, UserRole.project_manager) else UserRole.project_manager,
    )
    session.add(member)

    await record_audit_log(
        session=session,
        action="PROJECT_CREATED",
        user_id=current_user.id,
        entity_type="project",
        entity_id=str(project.id),
        entity_title=project.name,
        ip_address=get_client_ip(request),
    )

    await session.commit()
    await session.refresh(project)
    return project


@router.get("", response_model=list[ProjectRead])
async def list_projects(
    current_user: CurrentUser,
    session: DbSession,
) -> list[Project]:
    """List accessible projects. Admins see all; users see projects they belong to."""
    if current_user.role == UserRole.admin:
        result = await session.execute(select(Project).order_by(Project.created_at.desc()))
        return list(result.scalars().all())

    stmt = (
        select(Project)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .where(ProjectMember.user_id == current_user.id)
        .order_by(Project.created_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> Project:
    """Get project details with project-scoped authorization check."""
    return await verify_project_access(project_id, current_user, session, "projects:view")


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    request: Request,
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    current_user: CurrentUser,
    session: DbSession,
) -> Project:
    project = await verify_project_access(project_id, current_user, session, "projects:manage")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    await record_audit_log(
        session=session,
        action="PROJECT_UPDATED",
        user_id=current_user.id,
        entity_type="project",
        entity_id=str(project.id),
        entity_title=project.name,
        ip_address=get_client_ip(request),
    )
    await session.commit()
    await session.refresh(project)
    return project


@router.post("/{project_id}/members", response_model=ProjectMemberRead, status_code=status.HTTP_201_CREATED)
async def add_project_member(
    request: Request,
    project_id: uuid.UUID,
    payload: ProjectMemberAdd,
    current_user: CurrentUser,
    session: DbSession,
) -> ProjectMember:
    """Add a team member to a project with project-scoped role."""
    await verify_project_access(project_id, current_user, session, "projects:manage")

    # Check user exists
    user_res = await session.execute(select(User).where(User.id == payload.user_id))
    target_user = user_res.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Check already member
    existing = await session.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == payload.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this project.",
        )

    member = ProjectMember(
        project_id=project_id,
        user_id=payload.user_id,
        role=payload.role,
    )
    session.add(member)

    await record_audit_log(
        session=session,
        action="PROJECT_MEMBER_ADDED",
        user_id=current_user.id,
        entity_type="project_member",
        entity_id=str(payload.user_id),
        entity_title=f"Project: {project_id}",
        ip_address=get_client_ip(request),
        details={"project_id": str(project_id), "user_id": str(payload.user_id), "role": payload.role.value},
    )

    await session.commit()
    return member
