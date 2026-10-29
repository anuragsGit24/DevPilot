"""
Architecture Recommendation API Router.

Provides endpoints for evaluating project requirements and synthesizing
evidence-based software architecture blueprints, technology stacks,
security & resilience patterns, and architectural decision records (ADRs).
"""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, get_client_ip, verify_project_access
from app.architecture.recommender import (
    ArchitectureRecommendationResult,
    generate_architecture_recommendation,
)
from app.core.audit import record_audit_log
from app.models import Requirement, WorkItem

router = APIRouter(prefix="/projects/{project_id}/architecture", tags=["architecture"])


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────────────────────────────────────

class ArchitectureRecommendRequest(BaseModel):
    """
    Request payload for architecture recommendation.
    Supports synthetic/supplementary constraints to enable autonomous evaluation
    independent of upstream document ingestion.
    """
    context: str = Field(
        default="",
        max_length=8000,
        description="Explicit requirement constraints, non-functional targets, or compliance signals.",
    )
    requirement_ids: list[uuid.UUID] | None = Field(
        default=None,
        description="Optional list of specific requirement UUIDs to scope the evaluation.",
    )


class ComponentOut(BaseModel):
    name: str
    role: str
    technology: str
    responsibilities: list[str] = Field(default_factory=list)


class AlternativeOut(BaseModel):
    name: str
    rationale: str
    tradeoffs: str


class ADROut(BaseModel):
    id: str
    title: str
    context: str
    decision: str
    consequences: str


class ArchitectureRecommendResponse(BaseModel):
    """Structured, validated response representing an architectural blueprint."""
    id: str
    project_id: str
    pattern: str
    summary: str
    components: list[ComponentOut]
    data_stores: list[dict[str, str]]
    security_patterns: list[str]
    resilience_patterns: list[str]
    deployment_topology: str
    alternatives: list[AlternativeOut]
    adrs: list[ADROut]
    risks: list[str]
    assumptions: list[str]
    rationale: str
    evidence: list[str]
    provider: str
    mermaid_diagram: str | None
    source_requirement_count: int
    created_at: str
    updated_at: str


# ──────────────────────────────────────────────────────────────────────────────
# Serialization Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _result_to_work_item_payload(result: ArchitectureRecommendationResult) -> dict[str, Any]:
    """Map recommendation domain result to database JSON payload and frontend domain structure."""
    return {
        "pattern": result.pattern,
        "summary": result.summary,
        "components": [
            {
                "name": c.name,
                "role": c.role,
                "technology": c.technology,
                "responsibilities": c.responsibilities,
            }
            for c in result.components
        ],
        "data_stores": result.data_stores,
        "dataStores": result.data_stores,
        "security_patterns": result.security_patterns,
        "securityConsiderations": result.security_patterns,
        "resilience_patterns": result.resilience_patterns,
        "resiliencePatterns": result.resilience_patterns,
        "deployment_topology": result.deployment_topology,
        "deploymentTopology": result.deployment_topology,
        "alternatives": [
            {"name": a.name, "rationale": a.rationale, "tradeoffs": a.tradeoffs}
            for a in result.alternatives
        ],
        "adrs": [
            {
                "id": a.id,
                "title": a.title,
                "context": a.context,
                "decision": a.decision,
                "consequences": a.consequences,
            }
            for a in result.adrs
        ],
        "decisions": [
            {
                "id": a.id,
                "title": a.title,
                "context": a.context,
                "decision": a.decision,
                "consequences": a.consequences,
            }
            for a in result.adrs
        ],
        "risks": result.risks,
        "assumptions": result.assumptions,
        "rationale": result.rationale,
        "evidence": result.evidence,
        "provider": result.provider,
        "mermaid_diagram": result.mermaid_diagram,
        "mermaidDiagram": result.mermaid_diagram,
        "title": f"Architecture: {result.pattern}",
    }


def _work_item_to_response(
    item: WorkItem, source_req_count: int
) -> ArchitectureRecommendResponse:
    p = item.payload or {}
    return ArchitectureRecommendResponse(
        id=str(item.id),
        project_id=str(item.project_id),
        pattern=p.get("pattern", "Modular Monolith"),
        summary=p.get("summary", ""),
        components=[ComponentOut(**c) for c in p.get("components", [])],
        data_stores=p.get("data_stores", p.get("dataStores", [])),
        security_patterns=p.get("security_patterns", p.get("securityConsiderations", [])),
        resilience_patterns=p.get("resilience_patterns", p.get("resiliencePatterns", [])),
        deployment_topology=p.get("deployment_topology", p.get("deploymentTopology", "")),
        alternatives=[AlternativeOut(**a) for a in p.get("alternatives", [])],
        adrs=[ADROut(**a) for a in p.get("adrs", p.get("decisions", []))],
        risks=p.get("risks", []),
        assumptions=p.get("assumptions", []),
        rationale=p.get("rationale", ""),
        evidence=p.get("evidence", []),
        provider=p.get("provider", "rules_based"),
        mermaid_diagram=p.get("mermaid_diagram", p.get("mermaidDiagram")),
        source_requirement_count=source_req_count,
        created_at=item.created_at.isoformat() if item.created_at else "",
        updated_at=item.updated_at.isoformat() if item.updated_at else "",
    )


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post(
    "/recommend",
    response_model=ArchitectureRecommendResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Recommend software architecture blueprint",
    description=(
        "Analyzes project requirements and explicit constraints to recommend an architecture "
        "pattern (e.g. Modular Monolith, Microservices), component topology, data-store selection, "
        "security safeguards, and architectural decision records (ADRs). Persists the recommendation "
        "as a canonical work item for long-term project retrieval."
    ),
)
async def recommend_architecture(
    request: Request,
    project_id: uuid.UUID,
    payload: ArchitectureRecommendRequest,
    current_user: CurrentUser,
    session: DbSession,
) -> ArchitectureRecommendResponse:
    await verify_project_access(project_id, current_user, session, "artifacts:generate")

    # Retrieve scoped requirements from database
    req_stmt = select(Requirement).where(Requirement.project_id == project_id)
    if payload.requirement_ids:
        req_stmt = req_stmt.where(Requirement.id.in_(payload.requirement_ids))
    req_result = await session.execute(req_stmt)
    db_reqs = req_result.scalars().all()

    requirements_dicts: list[dict[str, Any]] = [
        {
            "title": r.title,
            "description": r.description,
            "category": r.category.value if r.category else "",
            "priority": r.priority.value if r.priority else "",
        }
        for r in db_reqs
    ]

    # Attempt structured LLM generation if available via provider-neutral adapter
    llm_payload_dict: dict[str, Any] | None = None
    llm_error_reason: str | None = None
    provider_name: str = "rules_based"

    try:
        from app.ai.llm import default_llm_client
        from app.ai.schemas import ArchitectureRecommendationPayload
        from app.core.config import get_settings
        settings = get_settings()

        system_prompt = (
            "You are an expert enterprise software architect. Analyze the project requirements and explicit constraints "
            "and output a structured architecture blueprint conforming to ArchitectureRecommendationPayload."
        )
        user_prompt = (
            f"Requirements: {requirements_dicts}\n"
            f"Explicit Context & Constraints: {payload.context}"
        )

        validated_obj, _ = await default_llm_client.generate_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_schema=ArchitectureRecommendationPayload,
        )
        if isinstance(validated_obj, ArchitectureRecommendationPayload):
            llm_payload_dict = validated_obj.model_dump()
            provider_name = f"llm:{settings.llm_provider.lower()}"
        elif isinstance(validated_obj, dict):
            validated_model = ArchitectureRecommendationPayload.model_validate(validated_obj)
            llm_payload_dict = validated_model.model_dump()
            provider_name = f"llm:{settings.llm_provider.lower()}"
    except Exception as exc:
        llm_error_reason = str(exc)
        llm_payload_dict = None

    if llm_payload_dict is not None:
        result = generate_architecture_recommendation(
            requirements=requirements_dicts,
            extra_context=payload.context,
            llm_response=llm_payload_dict,
        )
        result.provider = provider_name
    else:
        result = generate_architecture_recommendation(
            requirements=requirements_dicts,
            extra_context=payload.context,
            llm_response=None,
        )
        result.provider = "rules_based"
        if llm_error_reason:
            result.rationale += f" [Note: LLM generation was unavailable ({llm_error_reason}). Deterministic rules-based recommendation used.]"

    work_item_payload = _result_to_work_item_payload(result)
    work_item_payload["source_requirement_count"] = len(db_reqs)

    # Persist or update existing architecture recommendation for this project
    existing_result = await session.execute(
        select(WorkItem).where(
            WorkItem.project_id == project_id,
            WorkItem.record_type == "architecture",
        ).order_by(WorkItem.created_at.desc()).limit(1)
    )
    existing_item = existing_result.scalar_one_or_none()

    if existing_item:
        existing_item.title = f"Architecture: {result.pattern}"
        existing_item.status = "draft"
        existing_item.payload = work_item_payload
        await session.commit()
        await session.refresh(existing_item)
        target_item = existing_item
    else:
        target_item = WorkItem(
            project_id=project_id,
            record_type="architecture",
            title=f"Architecture: {result.pattern}",
            status="draft",
            payload=work_item_payload,
            source_ids=[str(r.id) for r in db_reqs],
            created_by=current_user.id,
        )
        session.add(target_item)
        await session.flush()

        await record_audit_log(
            session=session,
            action="ARCHITECTURE_RECOMMENDED",
            user_id=current_user.id,
            entity_type="architecture",
            entity_id=str(target_item.id),
            entity_title=target_item.title,
            ip_address=get_client_ip(request),
            details={
                "project_id": str(project_id),
                "pattern": result.pattern,
                "provider": result.provider,
            },
        )
        await session.commit()
        await session.refresh(target_item)

    return _work_item_to_response(target_item, len(db_reqs))


@router.get(
    "",
    response_model=ArchitectureRecommendResponse,
    summary="Get current architecture blueprint for project",
)
async def get_current_architecture(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> ArchitectureRecommendResponse:
    await verify_project_access(project_id, current_user, session, "artifacts:view")

    existing_result = await session.execute(
        select(WorkItem).where(
            WorkItem.project_id == project_id,
            WorkItem.record_type == "architecture",
        ).order_by(WorkItem.created_at.desc()).limit(1)
    )
    existing_item = existing_result.scalar_one_or_none()
    if not existing_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No architecture recommendation exists for this project yet.",
        )

    return _work_item_to_response(existing_item, len(existing_item.source_ids or []))
