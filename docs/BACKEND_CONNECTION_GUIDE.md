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
