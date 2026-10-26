# DevPilot — AI-Powered SDLC Co-Pilot

**Status:** Phase P1 Foundation completed with **Real Authentication & Server-Side RBAC** (bcrypt password hashing, JWT session handling, single-use reset tokens, failed-login lockout controls, project-scoped isolation, immutable audit logging) and dual database support (**Local Docker PostgreSQL** & **Google Cloud SQL PostgreSQL 16 on GCP $300 Free Credits**). See [GCP Migration Guide](docs/architecture/GCP_DATABASE_MIGRATION_GUIDE.md).

## Overview
DevPilot is a human-in-the-loop SDLC assistant that transforms public/synthetic business requirements into traceable user stories, acceptance criteria, test cases, OpenAPI specifications, architecture recommendations, and sprint plans. It also includes prompt versioning, baseline evaluation, an open-source case study, dashboard, exports, authentication/RBAC, and a contextual assistant.

## Implemented Architecture
- **Frontend:** React 19 + TypeScript + Tailwind CSS, full corporate design system, responsive layouts.
- **Backend:** Python 3.12 + FastAPI + SQLAlchemy 2.0 Async + asyncpg.
- **Database Options:**
  - **Local:** PostgreSQL 16 Alpine via `docker-compose.yml`.
  - **Cloud:** Google Cloud SQL (PostgreSQL 16) via `docker-compose.gcp.yml` with Cloud SQL Auth Proxy (mTLS). See [GCP Migration Guide](docs/architecture/GCP_DATABASE_MIGRATION_GUIDE.md).
- **Authentication & RBAC (Completed Phase P1):**
  - Real user registration and administrative user provisioning.
  - Salted Bcrypt password hashing (work factor 12).
  - Short-lived JWT access tokens (60m) & rotating refresh tokens (7 days).
  - Single-use, expiring SHA-256 hashed password reset tokens.
  - Brute-force protection & automatic account lockout (5 failed attempts -> 15 min lockout cooldown).
  - Fine-grained server-side RBAC across 5 enterprise roles: Admin, Project Manager, Business Analyst, Developer, Tester.
  - Project-scoped data isolation & membership access verification.
  - Immutable audit trail ledger (`audit_logs`) recording logins, lockouts, resets, role edits, and operations.
- **Quality & Tests:** Automated test suites passing in pytest (unit & integration) and Vite/TypeScript compiler checks.

## Documentation Map
- [GCP Cloud SQL Migration Guide](docs/architecture/GCP_DATABASE_MIGRATION_GUIDE.md)
- [Backend connection guide](docs/BACKEND_CONNECTION_GUIDE.md)
- [Charter](docs/PROJECT_CHARTER.md) · [PRD](docs/PRD.md) · [Traceability](docs/REQUIREMENTS_TRACEABILITY.md)
- [Roadmap](docs/IMPLEMENTATION_ROADMAP.md) · [Agile plan](docs/AGILE_PLAN.md)
- [Solution architecture](docs/architecture/SOLUTION_ARCHITECTURE.md) · [HLD](docs/architecture/HLD.md) · [LLD](docs/architecture/LLD.md) · [Data model](docs/architecture/DATA_MODEL.md)
- [AI/RAG pipeline](docs/architecture/AI_PIPELINE_AND_RAG.md) · [Security architecture](docs/architecture/SECURITY_ARCHITECTURE.md) · [ADRs](docs/architecture/ADRS.md) · [API](docs/API_SPECIFICATION.md)
- Feature specs: [Ingestion](docs/features/REQUIREMENT_INGESTION.md), [Generation](docs/features/ARTIFACT_GENERATION.md), [Prompt library](docs/features/PROMPT_LIBRARY.md), [Evaluation](docs/features/EVALUATION_FRAMEWORK.md), [Case study](docs/features/CASE_STUDY.md), [Dashboard](docs/features/PROJECT_DASHBOARD.md), [Exports](docs/features/EXPORTS_AND_INTEGRATIONS.md), [Auth/RBAC](docs/features/AUTHENTICATION_AND_RBAC.md), [Assistant](docs/features/AI_ASSISTANT.md)
- AI engineering: [Prompt guide](docs/ai/PROMPT_ENGINEERING_GUIDE.md), [Prompt specification](docs/ai/PROMPT_LIBRARY_SPECIFICATION.md), [Evaluation methodology](docs/ai/EVALUATION_METHODOLOGY.md), [Provider strategy](docs/ai/MODEL_PROVIDER_STRATEGY.md)
- Operations: [Test strategy](docs/testing/TEST_STRATEGY.md), [Test plan](docs/testing/TEST_PLAN.md), [Security checklist](docs/SECURITY_CHECKLIST.md), [CI/CD](docs/DEVOPS_AND_CICD.md), [Runbook](docs/OBSERVABILITY_AND_RUNBOOK.md), [Deployment](docs/DEPLOYMENT_GUIDE.md), [User guide](docs/USER_GUIDE.md), [Admin guide](docs/ADMIN_GUIDE.md), [Final deliverables](docs/DEMO_AND_FINAL_DELIVERABLES.md), [Contributing](CONTRIBUTING.md).

## Quick Start

### 1. Backend with Local or GCP Database
```bash
# Local Docker Postgres:
docker compose up --build

# Or with GCP Cloud SQL ($300 Credit Project):
docker compose -f docker-compose.gcp.yml up --build
```

### 2. Frontend Development Server
```bash
cd devpilot-frontend
npm install
npm run dev
```

### 3. Run Backend Automated Test Suite
```bash
python -m pytest backend/tests
```
