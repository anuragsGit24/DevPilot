"""
Domain Artifact Generators for DevPilot AI Generation Pipeline.
Integrates directly with Engineer 1's Ingestion & pgvector embeddings,
performs RAG retrieval, invokes LLM with structured prompts, and manages artifact versioning.
"""
import uuid
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm import default_llm_client
from app.ai.schemas import (
    AcceptanceCriteriaPayload,
    OpenApiSpecPayload,
    TestCasesPayload,
    UserStoriesPayload,
)
from app.core.audit import record_audit_log
from app.ingestion.embeddings import embed_texts
from app.models import (
    Artifact,
    ArtifactType,
    ArtifactVersion,
    Project,
    Requirement,
    RequirementChunk,
    ReviewStatus,
    User,
)
from app.prompts.templates import (
    ACCEPTANCE_CRITERIA_PROMPT,
    ACCEPTANCE_CRITERIA_SYSTEM_PROMPT,
    OPENAPI_SPEC_PROMPT,
    OPENAPI_SPEC_SYSTEM_PROMPT,
    TEST_CASES_PROMPT,
    TEST_CASES_SYSTEM_PROMPT,
    USER_STORIES_PROMPT,
    USER_STORIES_SYSTEM_PROMPT,
)


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or not left:
        return 0.0
    numerator = sum(a * b for a, b in zip(left, right))
    left_norm = sum(v * v for v in left) ** 0.5
    right_norm = sum(v * v for v in right) ** 0.5
    return numerator / (left_norm * right_norm) if left_norm and right_norm else 0.0


async def resolve_requirements_context(
    session: AsyncSession,
    project_id: uuid.UUID,
    requirement_ids: list[uuid.UUID] | None = None,
    query: str | None = None,
    limit: int = 10,
) -> tuple[list[Requirement], str]:
    """
    RAG Retrieval over Engineer 1's requirements and pgvector embeddings.
    If requirement_ids are given, loads them directly.
    If query is given, executes semantic vector similarity search.
    Otherwise loads all requirements for the project.
    """
    requirements: list[Requirement] = []

    if requirement_ids:
        stmt = select(Requirement).where(
            Requirement.project_id == project_id,
            Requirement.id.in_(requirement_ids),
        )
        res = await session.execute(stmt)
        requirements = list(res.scalars().all())

    elif query:
        # Vector semantic retrieval
        try:
            query_vectors = await embed_texts([query], prompt_name="SearchQuery")
            query_vector = query_vectors[0] if query_vectors else []
        except Exception:
            query_vector = []

        if query_vector:
            chunk_stmt = select(RequirementChunk, Requirement).join(
                Requirement, Requirement.id == RequirementChunk.requirement_id
            ).where(
                RequirementChunk.project_id == project_id,
                RequirementChunk.embedding.is_not(None),
            )
            chunk_res = await session.execute(chunk_stmt)
            rows = chunk_res.all()

            ranked = sorted(
                ((_cosine_similarity(query_vector, chunk.embedding or []), chunk, req) for chunk, req in rows),
                key=lambda item: item[0],
                reverse=True,
            )

            seen_ids = set()
            for _, _, req in ranked:
                if req.id not in seen_ids:
                    seen_ids.add(req.id)
                    requirements.append(req)
                if len(requirements) >= limit:
                    break

    if not requirements:
        # Fallback: load project requirements
        res = await session.execute(
            select(Requirement).where(Requirement.project_id == project_id).limit(limit)
        )
        requirements = list(res.scalars().all())

    # Build structured text representation for LLM prompt
    if requirements:
        context_lines = []
        for r in requirements:
            context_lines.append(
                f"- [{r.requirement_key}] ({r.priority.value if r.priority else 'must'}, {r.category.value if r.category else 'functional'}) "
                f"{r.title}: {r.description}"
            )
        formatted_context = "\n".join(context_lines)
    else:
        formatted_context = "No specific requirement statements found. Generate based on general project context."

    return requirements, formatted_context


class ArtifactGeneratorService:
    """Orchestrates end-to-end generation, schema validation, and database versioning."""

    @classmethod
    async def generate_user_stories(
        cls,
        session: AsyncSession,
        project: Project,
        user: User,
        requirement_ids: list[uuid.UUID] | None = None,
        query: str | None = None,
        title: str | None = None,
        client_ip: str | None = None,
    ) -> Artifact:
        requirements, req_context = await resolve_requirements_context(
            session=session,
            project_id=project.id,
            requirement_ids=requirement_ids,
            query=query,
        )

        user_prompt = USER_STORIES_PROMPT.format(
            project_name=project.name,
            domain_context=project.description or "Enterprise Software System",
            requirements_context=req_context,
        )

        payload_obj, llm_meta = await default_llm_client.generate_structured(
            system_prompt=USER_STORIES_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_schema=UserStoriesPayload,
        )

        payload = payload_obj.model_dump() if hasattr(payload_obj, "model_dump") else payload_obj
        artifact_title = title or f"User Stories — {project.name}"

        return await cls._persist_artifact(
            session=session,
            project_id=project.id,
            user=user,
            artifact_type=ArtifactType.user_stories,
            title=artifact_title,
            payload=payload,
            source_requirements=requirements,
            llm_meta=llm_meta,
            client_ip=client_ip,
        )

    @classmethod
    async def generate_acceptance_criteria(
        cls,
        session: AsyncSession,
        project: Project,
        user: User,
        requirement_ids: list[uuid.UUID] | None = None,
        query: str | None = None,
        title: str | None = None,
        client_ip: str | None = None,
    ) -> Artifact:
        requirements, req_context = await resolve_requirements_context(
            session=session,
            project_id=project.id,
            requirement_ids=requirement_ids,
            query=query,
        )

        user_prompt = ACCEPTANCE_CRITERIA_PROMPT.format(
            project_name=project.name,
            requirements_context=req_context,
            stories_context="Decomposed from attached source requirements.",
        )

        payload_obj, llm_meta = await default_llm_client.generate_structured(
            system_prompt=ACCEPTANCE_CRITERIA_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_schema=AcceptanceCriteriaPayload,
        )

        payload = payload_obj.model_dump() if hasattr(payload_obj, "model_dump") else payload_obj
        artifact_title = title or f"Acceptance Criteria — {project.name}"

        return await cls._persist_artifact(
            session=session,
            project_id=project.id,
            user=user,
            artifact_type=ArtifactType.acceptance_criteria,
            title=artifact_title,
            payload=payload,
            source_requirements=requirements,
            llm_meta=llm_meta,
            client_ip=client_ip,
        )

    @classmethod
    async def generate_test_cases(
        cls,
        session: AsyncSession,
        project: Project,
        user: User,
        requirement_ids: list[uuid.UUID] | None = None,
        query: str | None = None,
        title: str | None = None,
        client_ip: str | None = None,
    ) -> Artifact:
        requirements, req_context = await resolve_requirements_context(
            session=session,
            project_id=project.id,
            requirement_ids=requirement_ids,
            query=query,
        )

        user_prompt = TEST_CASES_PROMPT.format(
            project_name=project.name,
            requirements_context=req_context,
            stories_context="Generated from functional and security criteria.",
        )

        payload_obj, llm_meta = await default_llm_client.generate_structured(
            system_prompt=TEST_CASES_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_schema=TestCasesPayload,
        )

        payload = payload_obj.model_dump() if hasattr(payload_obj, "model_dump") else payload_obj
        artifact_title = title or f"Test Case Suite — {project.name}"

        return await cls._persist_artifact(
            session=session,
            project_id=project.id,
            user=user,
            artifact_type=ArtifactType.test_cases,
            title=artifact_title,
            payload=payload,
            source_requirements=requirements,
            llm_meta=llm_meta,
            client_ip=client_ip,
        )

    @classmethod
    async def generate_api_spec(
        cls,
        session: AsyncSession,
        project: Project,
        user: User,
        requirement_ids: list[uuid.UUID] | None = None,
        query: str | None = None,
        title: str | None = None,
        client_ip: str | None = None,
    ) -> Artifact:
        requirements, req_context = await resolve_requirements_context(
            session=session,
            project_id=project.id,
            requirement_ids=requirement_ids,
            query=query,
        )

        user_prompt = OPENAPI_SPEC_PROMPT.format(
            project_name=project.name,
            requirements_context=req_context,
        )

        payload_obj, llm_meta = await default_llm_client.generate_structured(
            system_prompt=OPENAPI_SPEC_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_schema=OpenApiSpecPayload,
        )

        payload = payload_obj.model_dump(by_alias=True) if hasattr(payload_obj, "model_dump") else payload_obj
        artifact_title = title or f"OpenAPI 3.1 Specification — {project.name}"

        return await cls._persist_artifact(
            session=session,
            project_id=project.id,
            user=user,
            artifact_type=ArtifactType.api_specification,
            title=artifact_title,
            payload=payload,
            source_requirements=requirements,
            llm_meta=llm_meta,
            client_ip=client_ip,
        )

    @classmethod
    async def _persist_artifact(
        cls,
        session: AsyncSession,
        project_id: uuid.UUID,
        user: User,
        artifact_type: ArtifactType,
        title: str,
        payload: dict[str, Any],
        source_requirements: list[Requirement],
        llm_meta: Any,
        client_ip: str | None = None,
    ) -> Artifact:
        source_req_ids = [str(r.id) for r in source_requirements]

        artifact = Artifact(
            id=uuid.uuid4(),
            project_id=project_id,
            artifact_type=artifact_type,
            title=title,
            status=ReviewStatus.draft,
            created_by=user.id,
        )
        session.add(artifact)
        await session.flush()

        version_record = ArtifactVersion(
            id=uuid.uuid4(),
            artifact_id=artifact.id,
            version_number=1,
            payload=payload,
            source_requirement_ids=source_req_ids,
            created_by=user.id,
        )
        session.add(version_record)

        await record_audit_log(
            session=session,
            action="ARTIFACT_GENERATED",
            user_id=user.id,
            entity_type="artifact",
            entity_id=str(artifact.id),
            entity_title=artifact.title,
            ip_address=client_ip,
            details={
                "project_id": str(project_id),
                "artifact_type": artifact_type.value,
                "model": getattr(llm_meta, "model", "mock"),
                "tokens": getattr(llm_meta, "total_tokens", 0),
                "latency_ms": getattr(llm_meta, "latency_ms", 0),
                "source_requirement_count": len(source_req_ids),
            },
        )

        await session.commit()
        await session.refresh(artifact)
        return artifact
