# Backend connection guide

## Local development

Prerequisites: Docker Desktop with the Linux engine enabled, Node.js LTS, and
Docker Compose.

Start PostgreSQL and the FastAPI service:

```powershell
docker compose up -d --build
docker compose ps
```

The API applies Alembic migrations before starting. Check the service:

```powershell
Invoke-WebRequest http://localhost:8000/api/v1/health/live
docker compose exec postgres pg_isready -U devpilot -d devpilot
```

The frontend runs separately:

```powershell
cd devpilot-frontend
pnpm install
pnpm dev
```

Open `http://localhost:5173`.

## Demo data (development only)

Demo seeding is disabled by default. Enable it explicitly with local
environment variables:

```powershell
$env:DEVPILOT_DEMO_SEED_ENABLED = "true"
$env:DEVPILOT_DEMO_ADMIN_PASSWORD = "choose-a-local-admin-password"
$env:DEVPILOT_DEMO_USER_PASSWORD = "choose-a-local-persona-password"
docker compose up -d --build
```

The seed is idempotent and creates five real backend users, the synthetic
`Retail Banking Demo` project, memberships, and representative work items.
It never runs on login and is rejected outside `DEVPILOT_ENVIRONMENT=development`.

Demo usernames:

| Persona | Email |
|---|---|
| Admin | `admin@devpilot.demo` |
| Project manager | `pm@devpilot.demo` |
| Business analyst | `ba@devpilot.demo` |
| Developer | `dev@devpilot.demo` |
| Tester | `qa@devpilot.demo` |

Use the password selected in `DEVPILOT_DEMO_USER_PASSWORD` for non-admin
personas and `DEVPILOT_DEMO_ADMIN_PASSWORD` for the admin. Do not use these
accounts or seed flags in production.

To run the seed manually after migrations:

```powershell
docker compose exec api python -m app.seed
```

Run the command again after pulling updated demo fixtures. It updates only
records carrying the demo seed key and does not modify ordinary user work.

## Persistence model

Projects and memberships are relational and authorization is checked on every
project-scoped request. Generated artifacts continue to use
`artifact_versions.payload` JSONB for versioned, traceable payloads.
Requirements, source documents, sprints, prompts, evaluations, and assistant
records use the project-scoped `work_items` table with a typed `record_type`,
status, creator, optional parent/source references, and JSONB payload. This
keeps flexible frontend payloads without putting canonical work in browser
storage.

Normal API startup runs `alembic upgrade head`; it does not reset or seed data
unless demo seeding is explicitly enabled.

## Requirements ingestion and embeddings

The default provider is an external OpenAI-compatible embedding API. Configure
it before uploading requirements:

```powershell
$env:DEVPILOT_EMBEDDING_PROVIDER = "api"
$env:DEVPILOT_EMBEDDING_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent"
$env:DEVPILOT_EMBEDDING_API_KEY = "your-gemini-api-key"
$env:DEVPILOT_EMBEDDING_MODEL = "gemini-embedding-2"
```

The backend uses Google’s native Gemini Embeddings REST contract: the
`x-goog-api-key` header, `content.parts[].text` request content, and
`embeddings[].values` response vectors. Document text uses the
`title: none | text: ...` format, while queries use
`task: search result | query: ...`. The default Docker build does not install
PyTorch, CUDA, or Sentence Transformers.

EmbeddingGemma remains available as an opt-in local provider. To build and run
that variant, set `DEVPILOT_EMBEDDING_PROVIDER=gemma` and run:

```powershell
docker compose build --build-arg INSTALL_LOCAL_EMBEDDINGS=true api
docker compose up -d
```

The Gemma variant uses `google/embeddinggemma-2`, text-only configuration,
`Document`/`SearchQuery` prompts, and CUDA when
`DEVPILOT_EMBEDDING_DEVICE=auto` detects a supported GPU.

Engineer 2 handoff: use `GET /api/v1/projects/{id}/requirements` for extracted
requirements and `POST /api/v1/projects/{id}/requirements/search` for RAG
context. Search results include requirement IDs, source metadata, chunk text,
and similarity scores.
