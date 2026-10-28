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

### Prerequisites

- Docker Desktop with the Linux engine enabled.
- Node.js LTS and npm (or pnpm).
- A Gemini API key for the default embedding provider.
- Git.

### 1. Configure the Gemini Embeddings API

Copy the backend environment template:

```powershell
Copy-Item backend\.env.example backend\.env
```

Edit `backend\.env` and replace the placeholder:

```env
DEVPILOT_EMBEDDING_API_KEY=your-real-gemini-api-key
```

Create a key at [Google AI Studio](https://aistudio.google.com/apikey).
Never commit `backend\.env` or paste an API key into `.env.example`.

The default provider is Google's `gemini-embedding-2` API. The default Docker
build does not install PyTorch, CUDA, or Sentence Transformers. Local
EmbeddingGemma remains available as an opt-in provider; see the
[backend connection guide](docs/BACKEND_CONNECTION_GUIDE.md).

### 2. Start the backend and local PostgreSQL

From the repository root:

```powershell
docker compose build api
docker compose up -d
docker compose ps
```

The Compose stack uses PostgreSQL 16 with pgvector. The API automatically runs
Alembic migrations before starting.

Verify the services:

```powershell
Invoke-RestMethod http://localhost:8000/api/v1/health/live
docker compose exec postgres pg_isready -U devpilot -d devpilot
```

The API documentation is available at
[http://localhost:8000/docs](http://localhost:8000/docs).

To inspect startup errors:

```powershell
docker compose logs --tail 100 api
```

### 3. Start the frontend

Open a second terminal:

```powershell
cd devpilot-frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 4. Run the backend tests

From the repository root:

```powershell
cd backend
python -m pip install -e ".[dev]"
python -m ruff check app tests migrations
python -m pytest tests
```

### 5. Test document ingestion and semantic search

Register a test user:

```powershell
$registerBody = @{
    name = "Test Analyst"
    email = "analyst@example.com"
    password = "TestPassword123!"
    role = "business_analyst"
} | ConvertTo-Json

try {
    Invoke-RestMethod `
        -Method Post `
        -Uri "http://localhost:8000/api/v1/auth/register" `
        -ContentType "application/json" `
        -Body $registerBody
}
catch {
    Write-Host "User may already exist; continuing to login."
}
```

Log in and select the automatically created workspace:

```powershell
$loginBody = @{
    email = "analyst@example.com"
    password = "TestPassword123!"
} | ConvertTo-Json

$login = Invoke-RestMethod `
    -Method Post `
    -Uri "http://localhost:8000/api/v1/auth/login" `
    -ContentType "application/json" `
    -Body $loginBody

$token = $login.access_token
$headers = @{ Authorization = "Bearer $token" }

$projects = Invoke-RestMethod `
    -Method Get `
    -Uri "http://localhost:8000/api/v1/projects" `
    -Headers $headers

$projectId = $projects[0].id
```

Create a sample requirements file:

```powershell
@'
The system must allow users to register with an email address and password.
The system shall authenticate users securely.
The application should return dashboard results within two seconds.
The system must encrypt passwords before storing them.
The dashboard should provide an accessible interface for screen-reader users.
'@ | Set-Content -Encoding utf8 requirements.txt
```

Upload it:

```powershell
$uploadRaw = curl.exe `
    -s `
    -X POST `
    "http://localhost:8000/api/v1/projects/$projectId/requirements/upload" `
    -H "Authorization: Bearer $token" `
    -F "file=@requirements.txt"

$upload = $uploadRaw | ConvertFrom-Json
$upload | ConvertTo-Json -Depth 10
```

Successful output includes:

```json
{
  "requirements_created": 5,
  "chunks_created": 5,
  "embedding_model": "gemini-embedding-2",
  "embeddings_generated": true
}
```

Search the stored embeddings:

```powershell
$searchBody = @{
    query = "How are user passwords protected?"
    limit = 3
} | ConvertTo-Json

$search = Invoke-RestMethod `
    -Method Post `
    -Uri "http://localhost:8000/api/v1/projects/$projectId/requirements/search" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $searchBody

$search | ConvertTo-Json -Depth 10
```

The password-encryption requirement should be among the top results.

For the complete handoff, troubleshooting, optional local Gemma setup, and
future work, see [Jash embedding updates](Jash_embedding_updates.md).
