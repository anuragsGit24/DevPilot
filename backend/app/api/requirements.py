import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from sqlalchemy import delete, select

from app.api.deps import CurrentUser, DbSession, get_client_ip, verify_project_access
from app.core.audit import record_audit_log
from app.core.config import get_settings
from app.ingestion.chunking import chunk_text
from app.ingestion.embeddings import EmbeddingProviderError, embed_texts
from app.ingestion.extractor import extract_requirements
from app.ingestion.parsers import DocumentParseError, parse_document
from app.ingestion.validation import UploadValidationError, validate_upload
from app.models import Requirement, RequirementChunk
from app.schemas import (
    RequirementRead,
    RequirementSearchRequest,
    RequirementSearchResponse,
    RequirementSearchResult,
    RequirementsUploadRead,
)

router = APIRouter(prefix="/projects/{project_id}/requirements", tags=["requirements"])


@router.post("/upload", response_model=RequirementsUploadRead, status_code=status.HTTP_201_CREATED)
async def upload_requirements(
    request: Request,
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    file: Annotated[UploadFile, File(...)],
) -> RequirementsUploadRead:
    await verify_project_access(project_id, current_user, session, "requirements:ingest")
    content = await file.read()
    try:
        validate_upload(file.filename, file.content_type, len(content))
        document = parse_document(content, file.filename or "", file.content_type)
    except (UploadValidationError, DocumentParseError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    extracted = extract_requirements(document.text)
    if not extracted:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No requirement statements were found in the uploaded document.",
        )
    settings = get_settings()

    # Query existing requirements for this project to support idempotent re-upload
    existing_stmt = select(Requirement).where(Requirement.project_id == project_id)
    existing_res = await session.execute(existing_stmt)
    existing_map = {r.requirement_key: r for r in existing_res.scalars().all()}

    requirements: list[Requirement] = []
    chunks: list[RequirementChunk] = []
    chunk_texts: list[str] = []
    for item in extracted:
        if item.requirement_key in existing_map:
            requirement = existing_map[item.requirement_key]
            requirement.title = item.title
            requirement.description = item.description
            requirement.category = item.category
            requirement.priority = item.priority
            requirement.source_document = Path(document.filename).name
            requirement.source_location = {"page_count": document.page_count}
            requirement.embedding_metadata = {"model": settings.embedding_model, "dimensions": settings.embedding_dimensions}
            await session.execute(
                delete(RequirementChunk).where(RequirementChunk.requirement_id == requirement.id)
            )
        else:
            requirement = Requirement(
                project_id=project_id,
                requirement_key=item.requirement_key,
                title=item.title,
                description=item.description,
                category=item.category,
                priority=item.priority,
                source_document=Path(document.filename).name,
                source_location={"page_count": document.page_count},
                embedding_metadata={"model": settings.embedding_model, "dimensions": settings.embedding_dimensions},
                created_by=current_user.id,
            )
            session.add(requirement)
        requirements.append(requirement)
        for chunk in chunk_text(item.description):
            record = RequirementChunk(
                project_id=project_id,
                requirement=requirement,
                chunk_index=chunk.index,
                content=chunk.content,
                token_count=chunk.token_count,
                embedding_metadata={"model": settings.embedding_model},
            )
            chunks.append(record)
            chunk_texts.append(chunk.content)

    try:
        vectors = await embed_texts(chunk_texts)
    except EmbeddingProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    embeddings_generated = bool(chunk_texts and vectors and vectors[0])
    for chunk, vector in zip(chunks, vectors):
        chunk.embedding = vector or None
    session.add_all(chunks)
    await record_audit_log(
        session=session,
        action="REQUIREMENTS_INGESTED",
        user_id=current_user.id,
        entity_type="requirement_document",
        entity_id=str(project_id),
        entity_title=document.filename,
        ip_address=get_client_ip(request),
        details={"project_id": str(project_id), "count": len(requirements)},
    )
    await session.commit()
    return RequirementsUploadRead(
        filename=document.filename,
        requirements_created=len(requirements),
        chunks_created=len(chunks),
        embedding_model=settings.embedding_model,
        embeddings_generated=embeddings_generated,
    )


@router.get("", response_model=list[RequirementRead])
async def list_requirements(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    category: str | None = None,
    priority: str | None = None,
) -> list[Requirement]:
    await verify_project_access(project_id, current_user, session, "requirements:view")
    stmt = select(Requirement).where(Requirement.project_id == project_id)
    if category:
        stmt = stmt.where(Requirement.category == category)
    if priority:
        stmt = stmt.where(Requirement.priority == priority)
    result = await session.execute(stmt.order_by(Requirement.requirement_key))
    return list(result.scalars().all())


@router.post("/search", response_model=RequirementSearchResponse)
async def search_requirements(
    project_id: uuid.UUID,
    payload: RequirementSearchRequest,
    current_user: CurrentUser,
    session: DbSession,
) -> RequirementSearchResponse:
    await verify_project_access(project_id, current_user, session, "requirements:view")
    try:
        query_vector = (await embed_texts([payload.query], prompt_name="SearchQuery"))[0]
    except EmbeddingProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    if not query_vector:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Semantic search is unavailable until an embedding provider is configured.",
        )
    result = await session.execute(
        select(RequirementChunk, Requirement)
        .join(Requirement, Requirement.id == RequirementChunk.requirement_id)
        .where(
            RequirementChunk.project_id == project_id,
            RequirementChunk.embedding.is_not(None),
        )
    )
    rows = result.all()
    ranked = sorted(
        ((_cosine_similarity(query_vector, chunk.embedding or []), chunk, requirement)
         for chunk, requirement in rows),
        key=lambda item: item[0],
        reverse=True,
    )[: payload.limit]
    return RequirementSearchResponse(
        results=[
            RequirementSearchResult(
                requirement=requirement,
                chunk=chunk,
                similarity=similarity,
            )
            for similarity, chunk, requirement in ranked
        ]
    )


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or not left:
        return 0.0
    numerator = sum(a * b for a, b in zip(left, right))
    left_norm = sum(value * value for value in left) ** 0.5
    right_norm = sum(value * value for value in right) ** 0.5
    return numerator / (left_norm * right_norm) if left_norm and right_norm else 0.0
