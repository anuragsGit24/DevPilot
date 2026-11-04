# Frontend UI and workflow review — frontend-fixes

The revised interface uses a compact graphite workspace with restrained accents, a project switcher, project rows, a review queue, and a smaller dashboard. Project context appears once; navigation comes from the selected URL. New sessions default to dark mode, and explicit theme preferences remain available.

## Connected workflows

- API calls default to `/api/v1`. Vite development and preview proxy `/api` to `http://127.0.0.1:8000`; `DEVPILOT_API_TARGET` overrides that target. A deployed frontend must reverse-proxy `/api` to FastAPI or set `VITE_API_URL` at build time.
- Project status and tags persist through the project API. Migration `0007_project_metadata` adds those fields.
- Manual requirements use the canonical requirements API. Creation, edits, and review status persist; migration `0008_requirement_status` adds review state. Updates show success only after the server accepts them.
- Workspace loading follows project URLs, drops cancelled loads, and offers retry on errors. Unknown project URLs show an unavailable state instead of another project's records.
- The assistant calls project-scoped backend endpoints and saves separate conversations per user. Conversation records are excluded from generic work-item operations and exports.
- Configured Gemini, OpenAI, or Anthropic providers use the existing adapter. With the default `mock` provider, the assistant explicitly identifies a saved-record summary rather than claiming AI analysis or compliance checks.
- API specification generation calls the existing backend artifact endpoint and reloads saved OpenAPI artifacts. The previous timer-only success action was removed.
- Failed document uploads after successful project creation return users to the created project, avoiding accidental duplicate project creation on retry.

## Validation

- Frontend production build and automated tests pass, including direct project URL isolation and shared control regressions.
- Backend suite: 123 tests passed, including new metadata, requirement review persistence, assistant history, and access isolation tests. Focused tests were rerun after the final assistant persistence adjustment.
- Live Chromium checks use the local FastAPI server and PostgreSQL, through the frontend proxy: registration, login, project creation, tag persistence, manual requirement creation and reload, API generation and reload, assistant messages and history reload, mobile navigation, and unavailable project URLs.
- A simulated temporary API failure verifies the visible error state and retry recovery.
- Desktop and mobile screenshots were reviewed. Dark hover states and metric dividers were corrected after inspection.

## Running locally

From the repository root:

```sh
docker compose up -d postgres
cd backend
uv sync --extra dev
uv run alembic upgrade head
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```sh
cd devpilot-frontend
npm ci
npm run dev
```

Apply both new migrations before running this version against an existing database. Real AI generation and document embeddings require configured providers. Full-repository lint debt and oversized build chunks remain; real external model responses, load testing, and cross-browser deployment validation are outside these local checks.

## Dark-mode screenshot regression pass

Fixed the selector specificity that allowed table component styles to override dark surfaces, borders, and text. Added theme coverage for translucent surface utilities, including export card headers and row hover states. Unknown requirement confidence displays as unscored, manual entries retain honest source context, and IDs stay on one line. The export header now follows the shared page hierarchy.

The page assistant fills the workspace, scrolls only its thread, and includes a useful empty state. Duplicate suggestions are hidden when empty, and the floating launcher is hidden on the assistant page.

Browser checks revisited requirements, export, evaluations, assistant, users, and audit views in both themes, plus mobile chat. Computed foreground/background contrast for the affected dark table cells was at least 4.5:1. Admin tables used read-only fixtures; other project pages used the local backend. Production build and all 32 frontend tests pass.
