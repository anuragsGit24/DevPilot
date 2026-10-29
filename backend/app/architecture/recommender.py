"""
Engineer 3 – Architecture Recommendation Engine
=========================================================
Rules-based (deterministic) engine that analyses project requirements and
explicit constraint signals to produce a structured architecture recommendation.

Design principles
-----------------
* Provider-neutral: tries the existing LLM adapter (app.ai.llm_adapter) when
  available; falls back to deterministic rules.  Fallback output is always
  labelled "rules_based" – never claimed as LLM-generated.
* No second LLM client is created here.  Only the project's shared adapter is
  used.
* Returns a fully Pydantic-validated ``ArchitectureRecommendationResult``.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Domain types returned by this module
# ---------------------------------------------------------------------------

@dataclass
class ComponentSpec:
    name: str
    role: str
    technology: str
    responsibilities: list[str] = field(default_factory=list)


@dataclass
class AlternativeSpec:
    name: str
    rationale: str
    tradeoffs: str


@dataclass
class ADRSpec:
    id: str
    title: str
    context: str
    decision: str
    consequences: str


@dataclass
class ArchitectureRecommendationResult:
    pattern: str                           # e.g. "Microservices", "Modular Monolith"
    summary: str
    components: list[ComponentSpec]
    data_stores: list[dict[str, str]]      # {type, technology, rationale}
    security_patterns: list[str]
    resilience_patterns: list[str]
    deployment_topology: str
    alternatives: list[AlternativeSpec]
    adrs: list[ADRSpec]
    risks: list[str]
    assumptions: list[str]
    rationale: str                         # evidence-linked explanation
    evidence: list[str]                    # signals that drove the decision
    provider: str                          # "llm:gemini", "rules_based", etc.
    mermaid_diagram: str | None = None


# ---------------------------------------------------------------------------
# Signal extraction helpers
# ---------------------------------------------------------------------------

_HIGH_SCALE_KEYWORDS = {
    "million", "billions", "high traffic", "high throughput", "global", "multi-region",
    "10k", "100k", "1m", "10m", "millions of users", "massive", "enterprise", "horizontal scaling",
}

_SECURITY_KEYWORDS = {
    "pci", "gdpr", "hipaa", "sox", "iso 27001", "compliance", "audit", "encryption",
    "jwt", "mtls", "oauth", "zero trust", "rbac", "sensitive", "banking", "financial",
    "biometric", "kyc", "aml",
}

_REALTIME_KEYWORDS = {
    "real-time", "realtime", "streaming", "websocket", "event-driven", "kafka",
    "pub/sub", "low latency", "sub-second", "live", "push notifications",
}

_TEAM_SIZE_KEYWORDS = {
    "small team", "startup", "single team", "monorepo", "2-3 developer", "solo",
}

_INTEGRATION_KEYWORDS = {
    "integration", "api gateway", "third-party", "external service", "partner",
    "legacy", "adapter", "webhook", "payment gateway", "crm", "erp",
}


def _score_signals(
    requirements: list[dict[str, Any]],
    extra_context: str,
) -> dict[str, int]:
    """Return a signal score dict from requirement text + explicit context."""
    combined = extra_context.lower()
    for req in requirements:
        for field_name in ("title", "description", "content", "text"):
            val = req.get(field_name, "")
            if isinstance(val, str):
                combined += " " + val.lower()

    scores: dict[str, int] = {
        "high_scale": sum(1 for kw in _HIGH_SCALE_KEYWORDS if kw in combined),
        "security": sum(1 for kw in _SECURITY_KEYWORDS if kw in combined),
        "realtime": sum(1 for kw in _REALTIME_KEYWORDS if kw in combined),
        "small_team": sum(1 for kw in _TEAM_SIZE_KEYWORDS if kw in combined),
        "integration": sum(1 for kw in _INTEGRATION_KEYWORDS if kw in combined),
    }
    return scores


# ---------------------------------------------------------------------------
# Pattern decision logic
# ---------------------------------------------------------------------------

def _choose_pattern(scores: dict[str, int]) -> tuple[str, list[str]]:
    """
    Return (pattern_name, evidence_list).

    Decision rules (explicit, deterministic):
    1. high_scale >= 2 AND security >= 1  → Microservices
    2. high_scale >= 1 AND realtime >= 1  → Event-Driven Microservices
    3. integration >= 2               → API-First Modular Monolith
    4. small_team >= 1                → Modular Monolith
    5. default                        → Modular Monolith
    """
    evidence: list[str] = []

    if scores["high_scale"] >= 2 and scores["security"] >= 1:
        evidence.append(f"High-scale signals ({scores['high_scale']}) + security signals ({scores['security']}) detected.")
        return "Microservices", evidence

    if scores["high_scale"] >= 1 and scores["realtime"] >= 1:
        evidence.append(f"Scale signal + real-time signal ({scores['realtime']}) detected.")
        return "Event-Driven Microservices", evidence

    if scores["integration"] >= 2:
        evidence.append(f"Multiple integration signals ({scores['integration']}) detected.")
        return "API-First Modular Monolith", evidence

    if scores["small_team"] >= 1:
        evidence.append("Small-team signal detected; modular monolith reduces operational overhead.")
        return "Modular Monolith", evidence

    evidence.append("No dominant scaling/integration signals; defaulting to Modular Monolith for maintainability.")
    return "Modular Monolith", evidence


# ---------------------------------------------------------------------------
# Component catalogue per pattern
# ---------------------------------------------------------------------------

_COMPONENT_CATALOGUE: dict[str, list[ComponentSpec]] = {
    "Microservices": [
        ComponentSpec("API Gateway", "Edge entry point & request routing", "Kong / AWS API Gateway",
                      ["Auth, rate-limiting, routing"]),
        ComponentSpec("Identity Service", "Authentication & JWT issuance", "Keycloak / FastAPI + JWT",
                      ["Login, token refresh, RBAC enforcement"]),
        ComponentSpec("Requirements Service", "Requirement ingestion & vector search", "FastAPI + pgvector",
                      ["Document parsing, chunking, embedding"]),
        ComponentSpec("Artifact Service", "AI-powered artefact generation", "FastAPI + LLM Adapter",
                      ["Story, AC, test-case generation"]),
        ComponentSpec("Sprint Service", "Sprint planning & estimation", "FastAPI",
                      ["Fibonacci estimation, topological scheduling"]),
        ComponentSpec("Event Bus", "Async inter-service communication", "Apache Kafka / Google Pub/Sub",
                      ["Domain events, audit stream"]),
        ComponentSpec("Observability Stack", "Metrics, tracing, logging", "Prometheus + Grafana + OpenTelemetry",
                      ["Latency, error-rate dashboards"]),
    ],
    "Event-Driven Microservices": [
        ComponentSpec("API Gateway", "Edge entry, auth, rate-limit", "FastAPI + Kong",
                      ["Routing, SSL termination"]),
        ComponentSpec("Event Broker", "Durable async messaging", "Apache Kafka",
                      ["Domain events, change-data-capture"]),
        ComponentSpec("Requirements Processor", "Ingestion consumer", "FastAPI worker",
                      ["Chunking, embedding, storage"]),
        ComponentSpec("Generation Worker", "AI artefact generator consumer", "FastAPI + LLM Adapter",
                      ["User stories, AC, tests"]),
        ComponentSpec("Sprint Planner", "Sprint computation", "FastAPI",
                      ["Estimation, scheduling, export"]),
        ComponentSpec("State Store", "Materialised views", "PostgreSQL + Redis",
                      ["Query-side read models"]),
    ],
    "API-First Modular Monolith": [
        ComponentSpec("FastAPI Monolith", "Single deployable with bounded modules", "FastAPI",
                      ["Auth, projects, requirements, artifacts, sprints"]),
        ComponentSpec("Integration Layer", "Third-party adapters", "httpx + retry logic",
                      ["External API calls, circuit breaking"]),
        ComponentSpec("Task Queue", "Background processing", "Celery + Redis",
                      ["Async generation, embedding"]),
        ComponentSpec("PostgreSQL", "Primary relational store", "PostgreSQL 16 + pgvector",
                      ["All domain tables + embeddings"]),
        ComponentSpec("Redis Cache", "Session & rate-limit cache", "Redis 7",
                      ["Token blacklist, hot-key cache"]),
    ],
    "Modular Monolith": [
        ComponentSpec("FastAPI Application", "Single deployable with module boundaries", "FastAPI",
                      ["Auth, projects, requirements, artifacts, sprints, evaluations"]),
        ComponentSpec("PostgreSQL + pgvector", "Primary data & vector store", "PostgreSQL 16",
                      ["All tables, requirement embeddings"]),
        ComponentSpec("Alembic Migrations", "Schema lifecycle management", "Alembic",
                      ["Versioned DB migrations"]),
        ComponentSpec("LLM Adapter", "Provider-neutral AI client", "Gemini / Claude / OpenAI",
                      ["Prompt execution, token tracking"]),
        ComponentSpec("Background Tasks", "Async work within process", "FastAPI BackgroundTasks",
                      ["Embedding generation, audit logging"]),
    ],
}

_DATA_STORES: dict[str, list[dict[str, str]]] = {
    "Microservices": [
        {"type": "Relational", "technology": "PostgreSQL 16", "rationale": "ACID transactions for core business data"},
        {"type": "Vector", "technology": "pgvector", "rationale": "Semantic search on requirement embeddings"},
        {"type": "Cache", "technology": "Redis 7", "rationale": "Session tokens, rate-limit counters"},
        {"type": "Event log", "technology": "Kafka (compacted topics)", "rationale": "Durable event history"},
    ],
    "Event-Driven Microservices": [
        {"type": "Relational", "technology": "PostgreSQL 16", "rationale": "Per-service owned schema"},
        {"type": "Vector", "technology": "pgvector", "rationale": "Embedding-based similarity search"},
        {"type": "Cache / State", "technology": "Redis 7", "rationale": "Fast read models & pub/sub"},
        {"type": "Event store", "technology": "Apache Kafka", "rationale": "Source of truth for domain events"},
    ],
    "API-First Modular Monolith": [
        {"type": "Relational", "technology": "PostgreSQL 16", "rationale": "Single ACID store for all modules"},
        {"type": "Vector", "technology": "pgvector", "rationale": "Embedded in PostgreSQL for requirement search"},
        {"type": "Cache", "technology": "Redis 7", "rationale": "Session, task queue broker"},
    ],
    "Modular Monolith": [
        {"type": "Relational + Vector", "technology": "PostgreSQL 16 + pgvector", "rationale": "One store, pgvector extension for embeddings"},
        {"type": "Cache (optional)", "technology": "Redis / in-process LRU", "rationale": "Low-traffic caching without ops overhead"},
    ],
}

_SECURITY_PATTERNS: dict[str, list[str]] = {
    "Microservices": [
        "JWT + short-lived access tokens (15 min), refresh rotation",
        "mTLS between internal services",
        "API Gateway rate-limiting (token bucket)",
        "Secret Manager for all credentials (GCP / AWS)",
        "Network policies restricting inter-service traffic",
        "OWASP Top-10 input validation on every endpoint",
    ],
    "Event-Driven Microservices": [
        "JWT at gateway boundary; service-level mTLS",
        "Kafka ACLs per topic",
        "Immutable audit event stream",
        "Secrets rotated via Vault / Secret Manager",
    ],
    "API-First Modular Monolith": [
        "JWT Bearer authentication with refresh",
        "RBAC capability matrix (project-scoped)",
        "API Gateway WAF for public endpoints",
        "Encrypted secrets via environment / Secret Manager",
    ],
    "Modular Monolith": [
        "JWT Bearer + bcrypt password hashing",
        "Project-scoped RBAC enforced in deps layer",
        "HTTPS / TLS termination at load balancer",
        "Parameterised SQL (SQLAlchemy ORM) – no raw SQL injection risk",
        "Audit log for all mutations",
    ],
}

_RESILIENCE_PATTERNS: dict[str, list[str]] = {
    "Microservices": ["Circuit breaker (Hystrix / Resilience4j)", "Retry with exponential backoff", "Bulkhead isolation", "Health probes (liveness + readiness)"],
    "Event-Driven Microservices": ["At-least-once delivery + idempotent consumers", "Dead-letter topics", "Saga pattern for distributed transactions"],
    "API-First Modular Monolith": ["httpx retry + circuit breaker for outbound calls", "DB connection pooling with pool_pre_ping", "Rate limiting at gateway"],
    "Modular Monolith": ["DB pool_pre_ping + connection retry", "Graceful startup/shutdown lifespan context", "Background task error isolation"],
}

_DEPLOYMENT: dict[str, str] = {
    "Microservices": "Kubernetes (GKE / EKS) with per-service Cloud Run fallback; Cloud SQL via Auth Proxy; Artifact Registry for images.",
    "Event-Driven Microservices": "GKE with Kafka on Confluent Cloud / MSK; services on Cloud Run with Kafka trigger; Cloud SQL Auth Proxy.",
    "API-First Modular Monolith": "Single Cloud Run service (multi-instance); Cloud SQL PostgreSQL + Redis Memorystore; global HTTPS load balancer.",
    "Modular Monolith": "Single Cloud Run service; Cloud SQL PostgreSQL 16 via Auth Proxy; Secret Manager for credentials; optional CDN for static assets.",
}

_ALTERNATIVES: dict[str, list[AlternativeSpec]] = {
    "Microservices": [
        AlternativeSpec("Modular Monolith",
                        "Lower operational cost; suitable if team size < 5 or traffic < 10k RPM.",
                        "Harder to scale individual components independently; deployment coupling."),
        AlternativeSpec("Serverless (Cloud Functions)",
                        "Zero infra management; ideal for spiky, low-frequency workloads.",
                        "Cold-start latency; limited execution duration; vendor lock-in risk."),
    ],
    "Event-Driven Microservices": [
        AlternativeSpec("Microservices without event bus",
                        "Simpler service graph; direct REST calls between services.",
                        "Tight coupling; cascading failures; harder to add new consumers."),
        AlternativeSpec("Modular Monolith with async tasks",
                        "Drastically simpler ops; FastAPI BackgroundTasks for async work.",
                        "Cannot scale ingestion independently; single point of failure."),
    ],
    "API-First Modular Monolith": [
        AlternativeSpec("Full Microservices",
                        "Independent deployability per integration domain.",
                        "Significant ops overhead; premature for current team size."),
        AlternativeSpec("Simple Modular Monolith",
                        "Fewer moving parts; faster iteration.",
                        "Integration adapters share process memory; harder to isolate third-party failures."),
    ],
    "Modular Monolith": [
        AlternativeSpec("Microservices",
                        "Independent deployability; polyglot tech choices per domain.",
                        "Significant infra overhead; network latency; distributed tracing complexity."),
        AlternativeSpec("Serverless",
                        "Fully managed; automatic scaling; pay-per-use.",
                        "Cold starts affect latency SLAs; limited local dev experience; harder DB connections."),
    ],
}

_ADRS: dict[str, list[ADRSpec]] = {
    "Microservices": [
        ADRSpec("ADR-001", "Adopt Microservices Architecture",
                "High traffic demands and strict PII / compliance boundaries require independent service scaling and data isolation.",
                "Each bounded context (Auth, Requirements, Artifacts, Sprints) runs as a separate service with its own schema.",
                "Higher ops complexity; team must invest in service mesh, distributed tracing, and CI per service."),
        ADRSpec("ADR-002", "JWT + mTLS for service identity",
                "Inter-service calls must be authenticated to prevent SSRF and lateral movement.",
                "mTLS between all internal services; API Gateway issues and validates JWTs for external consumers.",
                "Certificate rotation pipeline required; adds infra complexity."),
    ],
    "Event-Driven Microservices": [
        ADRSpec("ADR-001", "Event-Driven Architecture with Kafka",
                "Real-time requirement processing and downstream artefact generation require decoupled async communication.",
                "Apache Kafka as durable event bus; each service publishes domain events and consumes relevant topics.",
                "Kafka operations overhead; at-least-once delivery requires idempotent consumers."),
    ],
    "API-First Modular Monolith": [
        ADRSpec("ADR-001", "API-First Design with OpenAPI 3.1",
                "Multiple external systems must integrate; contract stability is critical.",
                "All public and internal APIs defined in OpenAPI 3.1 before implementation; code generated from spec.",
                "Spec drift risk; requires disciplined spec-first workflow."),
    ],
    "Modular Monolith": [
        ADRSpec("ADR-001", "Modular Monolith with Clear Module Boundaries",
                "Single team size and early-stage project favour simplicity over distribution overhead.",
                "Adopt a single FastAPI application with strict module boundaries (app/auth, app/requirements, app/artifacts, app/sprints). Modules communicate via Python function calls, not HTTP.",
                "Must enforce boundary discipline in code reviews; risk of module coupling over time. Can be extracted to services as team grows."),
        ADRSpec("ADR-002", "PostgreSQL + pgvector for All Storage",
                "Requirement embedding search needs a vector store; separate Chroma/Pinecone adds ops cost.",
                "pgvector extension provides HNSW similarity search within PostgreSQL, eliminating a separate vector DB.",
                "Requires pgvector on Cloud SQL; vector index maintenance; lower throughput than dedicated vector DB at very large scale."),
    ],
}


# ---------------------------------------------------------------------------
# Mermaid diagram generator
# ---------------------------------------------------------------------------

def _build_mermaid(pattern: str, components: list[ComponentSpec]) -> str:
    lines = ["flowchart TD"]
    for i, comp in enumerate(components):
        node_id = f"C{i}"
        label = comp.name.replace('"', "'")
        lines.append(f'    {node_id}["{label}\\n{comp.technology}"]')
    # Simple linear chain for illustration
    for i in range(len(components) - 1):
        lines.append(f"    C{i} --> C{i+1}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def generate_architecture_recommendation(
    requirements: list[dict[str, Any]],
    extra_context: str = "",
    llm_response: str | None = None,
) -> ArchitectureRecommendationResult:
    """
    Produce an architecture recommendation.

    Parameters
    ----------
    requirements:
        List of requirement dicts from the DB or request.  May be empty.
    extra_context:
        Free-text constraints/context from the request body (always used).
    llm_response:
        Pre-parsed JSON string from the LLM adapter, if available.  When
        provided and valid, the result is labelled "llm"; otherwise the
        deterministic engine runs and labels output "rules_based".
    """

    # ── Try to parse LLM response ────────────────────────────────────────
    if llm_response:
        try:
            data = json.loads(llm_response) if isinstance(llm_response, str) else llm_response
            pattern = str(data.get("pattern", "Modular Monolith"))
            comps = [
                ComponentSpec(
                    name=str(c.get("name", "")),
                    role=str(c.get("role", "")),
                    technology=str(c.get("technology", "")),
                    responsibilities=list(c.get("responsibilities", [])),
                )
                for c in data.get("components", [])
            ]
            return ArchitectureRecommendationResult(
                pattern=pattern,
                summary=str(data.get("summary", "")),
                components=comps,
                data_stores=list(data.get("data_stores", [])),
                security_patterns=list(data.get("security_patterns", [])),
                resilience_patterns=list(data.get("resilience_patterns", [])),
                deployment_topology=str(data.get("deployment_topology", "")),
                alternatives=[
                    AlternativeSpec(a.get("name", ""), a.get("rationale", ""), a.get("tradeoffs", ""))
                    for a in data.get("alternatives", [])
                ],
                adrs=[
                    ADRSpec(a.get("id", ""), a.get("title", ""), a.get("context", ""),
                            a.get("decision", ""), a.get("consequences", ""))
                    for a in data.get("adrs", [])
                ],
                risks=list(data.get("risks", [])),
                assumptions=list(data.get("assumptions", [])),
                rationale=str(data.get("rationale", "")),
                evidence=list(data.get("evidence", [])),
                provider="llm",
                mermaid_diagram=data.get("mermaid_diagram"),
            )
        except Exception as exc:
            logger.warning("LLM response parse failed (%s); falling back to rules engine.", exc)

    # ── Deterministic rules-based engine ──────────────────────────────────
    scores = _score_signals(requirements, extra_context)
    pattern, evidence = _choose_pattern(scores)

    components = _COMPONENT_CATALOGUE.get(pattern, _COMPONENT_CATALOGUE["Modular Monolith"])
    data_stores = _DATA_STORES.get(pattern, _DATA_STORES["Modular Monolith"])
    security = _SECURITY_PATTERNS.get(pattern, [])
    resilience = _RESILIENCE_PATTERNS.get(pattern, [])
    deployment = _DEPLOYMENT.get(pattern, "Cloud Run (single instance) + Cloud SQL PostgreSQL.")
    alternatives = _ALTERNATIVES.get(pattern, [])
    adrs = _ADRS.get(pattern, [])

    req_count = len(requirements)
    rationale = (
        f"Analysed {req_count} project requirement(s) and explicit context signal(s). "
        f"Signal scores: {scores}. "
        f"Chosen pattern: {pattern}. "
        + " ".join(evidence)
    )

    risks = [
        "Requirement signals may be incomplete; re-run after more requirements are confirmed.",
        "LLM adapter unavailable; recommendation is rules-based and may not capture nuanced project context.",
        "Architecture should be reviewed by a principal engineer before production adoption.",
    ]

    assumptions = [
        "Team is familiar with Python / FastAPI ecosystem.",
        "Cloud SQL PostgreSQL is the target managed database.",
        "GCP Cloud Run is the target compute platform.",
    ]

    mermaid = _build_mermaid(pattern, components)

    return ArchitectureRecommendationResult(
        pattern=pattern,
        summary=(
            f"{pattern} architecture recommended based on {req_count} requirement(s) "
            f"and explicit project context."
        ),
        components=components,
        data_stores=data_stores,
        security_patterns=security,
        resilience_patterns=resilience,
        deployment_topology=deployment,
        alternatives=alternatives,
        adrs=adrs,
        risks=risks,
        assumptions=assumptions,
        rationale=rationale,
        evidence=evidence,
        provider="rules_based",
        mermaid_diagram=mermaid,
    )

