# Jash Embedding Updates

This document explains the requirements-ingestion and embedding work completed
on the Engineer 1 branch. It is intended for another developer who needs to
test the branch first and then continue implementing the platform.

## 1. What was implemented

The branch adds a project-scoped requirements ingestion pipeline:

```text
PDF/DOCX/TXT/Markdown document
    -> document parsing
    -> requirement extraction
    -> REQ-001, REQ-002, ... identifiers
    -> category classification
    -> MoSCoW priority classification
    -> 500-token chunks with 50-token overlap
    -> embedding generation
    -> pgvector storage
    -> project-scoped semantic search
```

### Main backend additions

- `backend/app/ingestion/parsers.py`
  - Parses PDF, DOCX, TXT, and Markdown files.
- `backend/app/ingestion/validation.py`
  - Validates file extensions, content type, size, and empty uploads.
- `backend/app/ingestion/extractor.py`
  - Extracts heuristic requirement statements.
  - Generates stable keys such as `REQ-001`.
  - Assigns categories and MoSCoW priorities.
- `backend/app/ingestion/chunking.py`
  - Chunks requirement text with a default size of 500 words/tokens and
    50-word/token overlap.
- `backend/app/ingestion/embeddings.py`
  - Calls the Google Gemini Embeddings API by default.
  - Preserves optional local EmbeddingGemma inference.
- `backend/app/api/requirements.py`
  - Upload, list, and semantic-search endpoints.

### Database additions

- `requirements` table for canonical extracted requirements.
- `requirement_chunks` table for chunk text and embedding vectors.
- pgvector extension enabled by migration `0005`.
- Local PostgreSQL uses `pgvector/pgvector:pg16`.

### API endpoints

```text
POST /api/v1/projects/{project_id}/requirements/upload
GET  /api/v1/projects/{project_id}/requirements
POST /api/v1/projects/{project_id}/requirements/search
```

All endpoints enforce the existing authentication, project membership, and
requirements RBAC capabilities.

## 2. Why EmbeddingGemma was tedious

The first implementation attempted to run Google's `embeddinggemma-2` locally
through Sentence Transformers. The model itself is useful, but the local
runtime has a large setup cost:

- PyTorch is a large dependency.
- CUDA-enabled PyTorch downloads several NVIDIA runtime libraries.
- The Docker image becomes several gigabytes larger.
- Docker builds take much longer.
- GPU passthrough must be configured for Docker Desktop.
- NVIDIA drivers, CUDA compatibility, and container runtime support must all
  be correct.
- Model weights are downloaded separately from Hugging Face on first use.
- Google/Gemma model access may require accepting terms.

For these reasons, local Gemma inference is preserved but is no longer part of
the default Docker build. The default branch uses the hosted Gemini Embeddings
API, which keeps the container lightweight and makes setup easier for other
developers.

## 3. Embedding provider configuration

The default provider is:

```env
DEVPILOT_EMBEDDING_PROVIDER=api
```

The implementation uses Google's native Gemini Embeddings REST API:

```text
https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent
```

The API uses the `x-goog-api-key` header and returns embedding values in the
`embedding.values` response field.

### Create the real environment file

Copy the example file:

```powershell
cd PathName\DevPilot
Copy-Item backend\.env.example backend\.env
```

Edit `backend\.env` and set:

```env
DEVPILOT_EMBEDDING_PROVIDER=api
DEVPILOT_EMBEDDING_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent
DEVPILOT_EMBEDDING_API_KEY=YOUR_REAL_GEMINI_API_KEY
DEVPILOT_EMBEDDING_MODEL=gemini-embedding-2
DEVPILOT_EMBEDDING_DIMENSIONS=768
```

Get the key from Google AI Studio:

```text
https://aistudio.google.com/apikey
```

Never commit `backend\.env`, paste the key into documentation, or leave a real
key in `.env.example`.

### Optional local Gemma provider

The local implementation is still available:

```env
DEVPILOT_EMBEDDING_PROVIDER=gemma
DEVPILOT_EMBEDDING_MODEL=google/embeddinggemma-2
DEVPILOT_EMBEDDING_DEVICE=auto
DEVPILOT_EMBEDDING_DIMENSIONS=768
```

The Gemma implementation preserves:

- `Document` prompt for document chunks.
- `SearchQuery` prompt for queries.
- Text-only model configuration.
- BF16 when supported.
- CUDA selection when available.
- CPU fallback when `auto` cannot find CUDA.

Do not use the Gemma provider with the default image because the default image
does not install Sentence Transformers or PyTorch.

To build the optional local model image:

```powershell
docker compose build --build-arg INSTALL_LOCAL_EMBEDDINGS=true api
```

If using the Gemma provider in Compose, also set the API service environment:

```yaml
DEVPILOT_EMBEDDING_PROVIDER: gemma
DEVPILOT_EMBEDDING_DEVICE: auto
```

GPU support requires a compatible NVIDIA driver and Docker GPU passthrough.

## 4. Test the branch before modifying it

### Prerequisites

- Docker Desktop with the Linux engine running.
- A Gemini API key.
- PowerShell.
- Git.

### Start the services

From the repository root:

```powershell
docker compose build api
docker compose up -d
docker compose ps
```

Expected services:

```text
devpilot-api-1       Up
devpilot-postgres-1  Up (healthy)
```

Check the API:

```powershell
Invoke-RestMethod http://localhost:8000/api/v1/health/live
```

Check logs:

```powershell
docker compose logs --tail 100 api
```

The API container runs `alembic upgrade head` during startup.

### Run the backend tests

For a local Python test environment:

```powershell
cd backend
python -m pip install -e ".[dev]"
python -m ruff check app tests migrations
python -m pytest tests
cd ..
```

The expected result for this branch is:

```text
22 tests passed
Ruff checks passed
```

The test suite includes parser, extractor, chunking, API-provider, local
provider/device-selection, authentication, health, and work-item tests.

## 5. End-to-end document and search test

The following commands test the actual Dockerized API.

### Register the test analyst

Run once:

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

### Login

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
$headers = @{
    Authorization = "Bearer $token"
}
```

### Get the project ID

Registration creates a personal workspace:

```powershell
$projects = Invoke-RestMethod `
    -Method Get `
    -Uri "http://localhost:8000/api/v1/projects" `
    -Headers $headers

$projectId = $projects[0].id
Write-Host "Project ID: $projectId"
```

### Create a sample document

From the repository root:

```powershell
@'
The system must allow users to register with an email address and password.

The system shall authenticate users securely.

The application should return dashboard results within two seconds.

The system must encrypt passwords before storing them.

The dashboard should provide an accessible interface for screen-reader users.
'@ | Set-Content -Encoding utf8 requirements.txt
```

### Upload, extract, chunk, and embed

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

Expected response:

```json
{
  "filename": "requirements.txt",
  "requirements_created": 5,
  "chunks_created": 5,
  "embedding_model": "gemini-embedding-2",
  "embeddings_generated": true
}
```

`embeddings_generated` must be `true`. If it is false or the request returns a
503, inspect the API logs and verify the Gemini key in `backend\.env`.

### List extracted requirements

```powershell
$requirements = Invoke-RestMethod `
    -Method Get `
    -Uri "http://localhost:8000/api/v1/projects/$projectId/requirements" `
    -Headers $headers

$requirements | Select-Object requirement_key, title, category, priority
```

### Search the stored embeddings

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

$search.results | ForEach-Object {
    [PSCustomObject]@{
        Requirement = $_.requirement.requirement_key
        Description = $_.requirement.description
        Chunk = $_.chunk.content
        Similarity = $_.similarity
    }
}
```

The password-encryption requirement should be among the top results.

## 6. Branch workflow for another developer

### Test this branch

```powershell
git fetch origin
git switch <jash-branch-name>
git pull --ff-only origin <jash-branch-name>
```

Then follow sections 3 through 5 of this document.

### Create a continuation branch

Do not add new work directly to the shared branch:

```powershell
git switch -c engineer-2-requirements-follow-up
```

After making changes:

```powershell
cd backend
python -m ruff check app tests migrations
python -m pytest tests
cd ..
git diff --check
git status
```

Commit only the intended changes:

```powershell
git add backend docs Jash_embedding_updates.md docker-compose.yml
git commit -m "Continue requirements embedding work"
git push -u origin engineer-2-requirements-follow-up
```

Open a pull request against the Jash branch or the repository's agreed
integration branch. Include:

- What was changed.
- Test commands and results.
- Any required environment variables.
- Whether the change affects the default API provider or optional Gemma mode.
- Any migration or Docker changes.

## 7. Recommended future work

### Search and RAG handoff

Engineer 2 should use:

```text
GET  /api/v1/projects/{project_id}/requirements
POST /api/v1/projects/{project_id}/requirements/search
```

Search results provide:

- Requirement metadata.
- Stable requirement key.
- Source document metadata.
- Matched chunk text.
- Similarity score.

These results can be passed into the artifact-generation and RAG pipeline as
traceable context. Generated artifacts should retain the source requirement
IDs so the output remains auditable.

## 8. Troubleshooting

### API key missing

```text
DEVPILOT_EMBEDDING_API_KEY must be configured when embedding_provider=api.
```

Confirm the key exists in `backend\.env`, then recreate the API:

```powershell
docker compose up -d --force-recreate api
```

### Gemini response error

```powershell
docker compose logs --tail 100 api
```

Confirm that the key is configured without printing it:

```powershell
docker compose exec api sh -c 'if [ -n "$DEVPILOT_EMBEDDING_API_KEY" ]; then echo "Gemini key configured"; else echo "Gemini key missing"; fi'
```

### API container import error

Rebuild after dependency changes:

```powershell
docker compose build api
docker compose up -d
```

### PostgreSQL or migration failure

```powershell
docker compose ps
docker compose logs postgres
docker compose exec postgres pg_isready -U devpilot -d devpilot
```

### Local Gemma accidentally enabled

Use the lightweight API configuration:

```env
DEVPILOT_EMBEDDING_PROVIDER=api
```

Then rebuild without the optional local dependency:

```powershell
docker compose build --build-arg INSTALL_LOCAL_EMBEDDINGS=false api
docker compose up -d
```
