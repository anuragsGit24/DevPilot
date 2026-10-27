# API Specification

## Conventions
Base path `/api/v1`; JSON by default; UTC ISO timestamps; bounded pagination; stable error envelope; project-scoped server-side authorization. Exact schemas should be generated from FastAPI and validated as OpenAPI 3.0 YAML/JSON.

```json
{"error":{"code":"VALIDATION_ERROR","message":"Request could not be validated.","request_id":"correlation-id","details":[{"field":"artifact_type","issue":"unsupported value"}]}}
```

Never expose stack traces, SQL, internal filesystem paths, provider keys or secret-bearing prompts.

## Endpoint inventory
| Method/path | Purpose |
|---|---|
| POST `/auth/register`, `/auth/login`, `/auth/logout` | Account/session lifecycle |
| POST `/auth/password-reset/request`, `/auth/password-reset/confirm` | Verified reset |
| GET `/me` | Current identity/role |
| GET/POST `/projects`; GET/PATCH `/projects/{id}` | Project management |
| GET/POST `/projects/{id}/work-items`; PATCH/DELETE `/projects/{id}/work-items/{item_id}` | Authorized persistence for flexible workspace records |
| GET `/projects/{id}/requirements` | List requirements; supports `category` and `priority` filters |
| POST `/projects/{id}/requirements/upload` | Upload PDF/DOCX/TXT/Markdown, extract requirements, chunk, and embed |
| POST `/projects/{id}/requirements/search` | Semantic search over project-scoped pgvector chunks |
| GET/PATCH `/requirements/{id}` | Read/edit/tag requirement |
| POST `/projects/{id}/artifacts/generate` | Generate selected artifact type |
| GET `/projects/{id}/artifacts`; GET/PATCH `/artifacts/{id}` | List/read/edit artifacts |
| POST `/artifacts/{id}/approve`, `/artifacts/{id}/regenerate` | Review/regenerate |
| GET `/artifacts/{id}/versions` | History |
| GET/POST `/prompts`; GET/POST `/prompts/{id}/versions` | Prompt catalogue/version |
| POST `/prompts/{id}/activate`, `/prompts/{id}/test` | Activation/testing |
| POST `/evaluations`; GET `/evaluations/{id}` | Evaluation |
| GET `/projects/{id}/dashboard`, `/activity` | Aggregates/activity |
| POST `/projects/{id}/exports` | Format/ZIP export |
| POST `/projects/{id}/assistant/messages` | Contextual assistant |
| GET `/health/live`, `/health/ready` | Liveness/readiness |

## Status codes
200 read/update; 201 created; 202 asynchronous job if implemented; 204 no content; 400 malformed; 401 unauthenticated; 403 forbidden; 404 absent/inaccessible per anti-enumeration policy; 409 version conflict; 413 too large; 415 unsupported media; 422 validation; 429 rate limited; 502/503/504 upstream failures; 500 unexpected error.

### Requirements ingestion contract

Upload uses `multipart/form-data` with a `file` field. The response reports the
number of requirements and chunks created, the configured local embedding model,
and whether embeddings were generated. Semantic search returns requirement
metadata, the matched chunk, and a cosine similarity score. All three endpoints
require project membership and the corresponding requirements capability.

The default provider is Google’s Gemini Embeddings API configured with
`DEVPILOT_EMBEDDING_API_URL` and `DEVPILOT_EMBEDDING_API_KEY`. It uses
`gemini-embedding-2:embedContent`, sends `content.parts[].text`, and reads
`embeddings[].values`. Document and query inputs use Google’s documented
retrieval prefixes. `google/embeddinggemma-2` remains available as an opt-in
local provider (`DEVPILOT_EMBEDDING_PROVIDER=gemma`). The default Docker build
does not install local model or CUDA dependencies.

## Generation request example
```json
{"artifact_type":"user_stories","source_requirement_ids":["requirement-id"],"options":{"detail_level":"standard","format":"json"}}
```
Validate IDs and project scope. Normal generation uses active prompt; arbitrary prompt-version selection is restricted to authorized testing. OpenAPI must include paths, methods, parameters, schemas, auth, headers, examples and error responses; automated validation is mandatory.
