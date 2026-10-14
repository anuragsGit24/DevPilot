# Low-Level Design

## Suggested backend boundaries
`api/v1`, `core`, `domain`, `services`, `repositories`, `ingestion`, `retrieval`, `ai`, `prompts`, `generation`, `evaluation`, `exports`, `observability`, `tests`. Frontend areas: auth, projects, requirements, artifacts, prompts, evaluations, dashboard, assistant, admin, shared accessible components.

## Service contracts
- `ingest_text(project_id, text, metadata, actor)` → requirement IDs and diagnostics.
- `ingest_file(project_id, file, actor)` → document record and parse status.
- `search(project_id, authorized_source_ids, query, top_k)` → ranked chunks with source IDs.
- `get_active_prompt(artifact_type)` → immutable prompt version.
- `generate(project_id, artifact_type, source_ids, options, actor)` → draft + provenance + validation.
- `evaluate(generated_version, baseline, method_version, actor)` → report.
- `export(version_ids, format, actor)` → stream/content, MIME type and safe filename.
- `require_permission(actor, action, resource)` → allow or typed denial.

## Validation
Bound uploads and pagination; allowlist file formats; reject self-dependencies and detect cycles; validate artifact types and versioned schemas; require traceability where relevant; parse Gherkin and OpenAPI 3.0; validate prompt variables; sanitize export filenames and ZIP entries. Use opaque IDs and verify project membership on every operation.

## Errors and persistence
Return stable `{code,message,request_id,details?}` errors without stack traces, SQL or secrets. Canonical writes are transactional. Optimistic versions protect concurrent edits. Prompt versions are immutable. Vector records are derived and rebuildable. Any generation repair is bounded and revalidated.
