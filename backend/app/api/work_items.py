import uuid

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, get_client_ip, verify_project_access
from app.core.audit import record_audit_log
from app.models import WorkItem
from app.schemas import WorkItemCreate, WorkItemRead, WorkItemUpdate

router = APIRouter(prefix="/projects/{project_id}/work-items", tags=["workspace"])


@router.get("", response_model=list[WorkItemRead])
async def list_work_items(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    record_type: str | None = None,
) -> list[WorkItem]:
    await verify_project_access(project_id, current_user, session, "projects:view")
    stmt = select(WorkItem).where(WorkItem.project_id == project_id)
    if record_type:
        stmt = stmt.where(WorkItem.record_type == record_type)
    result = await session.execute(stmt.order_by(WorkItem.created_at.desc()))
    return list(result.scalars().all())


@router.post("", response_model=WorkItemRead, status_code=status.HTTP_201_CREATED)
async def create_work_item(
    request: Request,
    project_id: uuid.UUID,
    payload: WorkItemCreate,
    current_user: CurrentUser,
    session: DbSession,
) -> WorkItem:
    await verify_project_access(project_id, current_user, session, "requirements:edit")
    client_id = payload.payload.get("id")
    if client_id:
        existing_result = await session.execute(
            select(WorkItem).where(
                WorkItem.project_id == project_id,
                WorkItem.record_type == payload.record_type,
                WorkItem.payload["id"].as_string() == str(client_id),
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            existing.title = payload.title
            existing.status = payload.status
            existing.payload = payload.payload
            existing.source_ids = [str(value) for value in payload.source_ids]
            existing.parent_id = payload.parent_id
            await session.commit()
            await session.refresh(existing)
            return existing
    if payload.parent_id:
        parent = await session.get(WorkItem, payload.parent_id)
        if not parent or parent.project_id != project_id:
            raise HTTPException(status_code=404, detail="Parent work item not found.")
    item = WorkItem(
        project_id=project_id,
        record_type=payload.record_type,
        title=payload.title,
        status=payload.status,
        payload=payload.payload,
        source_ids=[str(value) for value in payload.source_ids],
        parent_id=payload.parent_id,
        created_by=current_user.id,
    )
    session.add(item)
    await session.flush()
    await record_audit_log(
        session=session,
        action="WORK_ITEM_CREATED",
        user_id=current_user.id,
        entity_type=payload.record_type,
        entity_id=str(item.id),
        entity_title=item.title,
        ip_address=get_client_ip(request),
        details={"project_id": str(project_id)},
    )
    await session.commit()
    await session.refresh(item)
    return item


@router.patch("/{item_id}", response_model=WorkItemRead)
async def update_work_item(
    request: Request,
    project_id: uuid.UUID,
    item_id: uuid.UUID,
    payload: WorkItemUpdate,
    current_user: CurrentUser,
    session: DbSession,
) -> WorkItem:
    await verify_project_access(project_id, current_user, session, "requirements:edit")
    item = await session.get(WorkItem, item_id)
    if not item or item.project_id != project_id:
        raise HTTPException(status_code=404, detail="Work item not found.")
    values = payload.model_dump(exclude_unset=True)
    if "source_ids" in values:
        values["source_ids"] = [str(value) for value in values["source_ids"]]
    for key, value in values.items():
        setattr(item, key, value)
    await record_audit_log(
        session=session,
        action="WORK_ITEM_UPDATED",
        user_id=current_user.id,
        entity_type=item.record_type,
        entity_id=str(item.id),
        entity_title=item.title,
        ip_address=get_client_ip(request),
        details={"project_id": str(project_id), "fields": list(values)},
    )
    await session.commit()
    await session.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_work_item(
    request: Request,
    project_id: uuid.UUID,
    item_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> None:
    await verify_project_access(project_id, current_user, session, "requirements:edit")
    item = await session.get(WorkItem, item_id)
    if not item or item.project_id != project_id:
        raise HTTPException(status_code=404, detail="Work item not found.")
    await record_audit_log(
        session=session,
        action="WORK_ITEM_DELETED",
        user_id=current_user.id,
        entity_type=item.record_type,
        entity_id=str(item.id),
        entity_title=item.title,
        ip_address=get_client_ip(request),
        details={"project_id": str(project_id)},
    )
    await session.delete(item)
    await session.commit()
