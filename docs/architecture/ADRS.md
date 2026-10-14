# Architecture Decision Records

All entries are **proposed** until confirmed; record owner/date/evidence when accepted.

## ADR-001 Modular monolith
**Decision:** One FastAPI deployment with explicit domain modules. **Reason:** 12–14-week scope; lower operations overhead than microservices. **Trade-off:** Maintain module boundaries and avoid circular dependencies.

## ADR-002 React/TypeScript + FastAPI
**Decision:** Proposed baseline aligned with source recommendation. **Reason:** typed UI/API and OpenAPI generation. Pin toolchain versions.

## ADR-003 PostgreSQL canonical store
**Decision:** PostgreSQL for users, projects, requirements, artifacts, prompts, evaluations and audit. **Alternative:** SQLite. **Reason:** transactions, relational integrity and multi-user demo realism.

## ADR-004 ChromaDB candidate
**Decision:** Evaluate ChromaDB in a short retrieval spike. **Alternatives:** FAISS, Pinecone, Weaviate. Vector data remains rebuildable and non-canonical.

## ADR-005 Provider adapter
**Decision:** Domain code uses an internal model-provider interface. **Reason:** model-agnostic requirement. Normalize errors, usage, timeouts and structured output capabilities.

## ADR-006 Immutable prompt/artifact versions
**Decision:** Every generation records prompt/provider/model/source provenance; prompt edits create new versions. **Reason:** audit and regression evaluation.

## ADR-007 Human approval
**Decision:** Outputs begin as drafts; acceptance requires explicit review. **Reason:** assistive AI and risk of unsupported claims.

## ADR-008 Docker Compose + GitHub Actions
**Decision:** Reproducible local/demo runtime and PR quality gates. No production banking deployment.

## Open decisions
Provider/model/data terms; vector store; file storage; sync vs background generation; reset email provider; metric formula; hosting target; Engineering Lead role mapping; case-study project/license.
