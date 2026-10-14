# Prompt Library Management

**Traceability:** UC-08, FR-08, SC-8, TO-4, BO-8.

Admin can create templates with name, description, artifact type, tags, owner, variable schema and output schema. Versions are immutable; edits create new versions. Lifecycle: draft → validated/tested → active → retired; rollback reactivates a previously tested version. Activation is atomic and audited. Imports create inactive versions and never overwrite history.

Prompt testing runs against versioned sample inputs and records output, schema validity, evaluation metrics, latency, token/cost usage if available and reviewer feedback. Track performance by exact prompt version; show sample count and date range. Validate variables and schema before invoking a provider. Keep secrets out of prompt text. Restrict activation to Admin in the proposed permission model.

**Acceptance:** catalogue filters by artifact type; history is preserved; tests are reproducible; activation/rollback are permission checked and audited; import/export use a versioned JSON schema; at least seven artifact types are supported; prompt performance is visible.

**Failure cases:** malformed import, missing variable, invalid template, provider outage during test, concurrent activation, unavailable test data.
