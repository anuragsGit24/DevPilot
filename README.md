# DevPilot — AI-Powered SDLC Co-Pilot

**Status:** Documentation blueprint only. No application implementation, test results, sponsor approval, or production readiness is implied. Primary source: `DevPilot_UseCase_v1.0_Standard`.

## Overview
DevPilot is a human-in-the-loop SDLC assistant that transforms public/synthetic business requirements into traceable user stories, acceptance criteria, test cases, OpenAPI specifications, architecture recommendations, and sprint plans. It also includes prompt versioning, baseline evaluation, an open-source case study, dashboard, exports, authentication/RBAC, and a contextual assistant.

## Proposed baseline (not a confirmed sponsor decision)
- Frontend: React + TypeScript, responsive and accessible components.
- Backend: Python + FastAPI + typed request/response schemas.
- Canonical data: PostgreSQL; vector retrieval: ChromaDB candidate.
- AI orchestration: LangChain behind a provider-neutral adapter.
- Models: approved cloud APIs, hosted/open-source models, or Ollama where supported.
- Auth: JWT/session strategy with Argon2id/bcrypt password hashing and server-side RBAC.
- Runtime/CI: Docker Compose, GitHub Actions.
- Tests/quality: pytest, React Testing Library, Playwright, Ruff/Black, ESLint/Prettier, dependency scanning.
- Observability: structured JSON logs, health checks, request tracing, LLM latency/token/cost metrics.

Technology choices are proposed because the source document allows selection. Preserve future repository decisions and record changes in `docs/architecture/ADRS.md`.

## Documentation map
- [Charter](docs/PROJECT_CHARTER.md) · [PRD](docs/PRD.md) · [Traceability](docs/REQUIREMENTS_TRACEABILITY.md)
- [Roadmap](docs/IMPLEMENTATION_ROADMAP.md) · [Agile plan](docs/AGILE_PLAN.md)
- [Solution architecture](docs/architecture/SOLUTION_ARCHITECTURE.md) · [HLD](docs/architecture/HLD.md) · [LLD](docs/architecture/LLD.md) · [Data model](docs/architecture/DATA_MODEL.md)
- [AI/RAG pipeline](docs/architecture/AI_PIPELINE_AND_RAG.md) · [Security architecture](docs/architecture/SECURITY_ARCHITECTURE.md) · [ADRs](docs/architecture/ADRS.md) · [API](docs/API_SPECIFICATION.md)
- Feature specs: [Ingestion](docs/features/REQUIREMENT_INGESTION.md), [Generation](docs/features/ARTIFACT_GENERATION.md), [Prompt library](docs/features/PROMPT_LIBRARY.md), [Evaluation](docs/features/EVALUATION_FRAMEWORK.md), [Case study](docs/features/CASE_STUDY.md), [Dashboard](docs/features/PROJECT_DASHBOARD.md), [Exports](docs/features/EXPORTS_AND_INTEGRATIONS.md), [Auth/RBAC](docs/features/AUTHENTICATION_AND_RBAC.md), [Assistant](docs/features/AI_ASSISTANT.md)
- AI engineering: [Prompt guide](docs/ai/PROMPT_ENGINEERING_GUIDE.md), [Prompt specification](docs/ai/PROMPT_LIBRARY_SPECIFICATION.md), [Evaluation methodology](docs/ai/EVALUATION_METHODOLOGY.md), [Provider strategy](docs/ai/MODEL_PROVIDER_STRATEGY.md)
- Operations: [Test strategy](docs/testing/TEST_STRATEGY.md), [Test plan](docs/testing/TEST_PLAN.md), [Security checklist](docs/SECURITY_CHECKLIST.md), [CI/CD](docs/DEVOPS_AND_CICD.md), [Runbook](docs/OBSERVABILITY_AND_RUNBOOK.md), [Deployment](docs/DEPLOYMENT_GUIDE.md), [User guide](docs/USER_GUIDE.md), [Admin guide](docs/ADMIN_GUIDE.md), [Final deliverables](docs/DEMO_AND_FINAL_DELIVERABLES.md), [Contributing](CONTRIBUTING.md).

## Prerequisites for future implementation
Git, pinned Python version, Node.js LTS, Docker Compose, PostgreSQL, selected vector store, and an approved model provider or local model. Create `.env` from `.env.example` when implementation begins; never commit secrets.

## Targets to measure, not claims
UI page load <2 s; non-AI API response <500 ms; standard artifact generation <30 s; dashboard render <3 s; ≥99% availability in test/demo. Record test conditions and results.

## Engineering gates
Structured SDLC phases; 1–2-week Agile sprints; PR reviews and protected main; ≥70% unit coverage target plus integration/E2E/security/AI regression tests; CI build/lint/test/scan/package/deploy/smoke stages; WCAG 2.1 AA target; JSON logs, health checks, LLM tracing, cost telemetry, backup/restore and runbooks.

## Exclusions
No requirements-to-code generation, real-time co-editing, production Jira/Azure DevOps integrations, custom model training/fine-tuning, production banking deployment, confidential/customer data sent to model APIs, automatic deployment of generated APIs, or real-time external-repository CI/CD.

## Status integrity
Source requirements are goals, not evidence of implementation. Report achieved metrics only with reproducible evidence.
