# Observability and Runbook

## Telemetry
Structured JSON logs: timestamp, level, module, request ID, safe actor/project IDs, action, outcome and duration. Metrics: request count/status/latency, parser errors, retrieval latency, generation latency, retries, schema-invalid rate, token/cost if available, DB/vector health and backup status. Trace API → retrieval → prompt → provider → validation → persistence. Never log secrets or unnecessary raw content.

## Provider outage
Inspect request ID and normalized error; verify provider config/quota without exposing keys; apply bounded retries; use only approved fallback; preserve input and mark failure/retryable; verify recovery with synthetic test.

## Invalid output
Inspect schema diagnostics and prompt/model version; confirm schema compatibility; rerun deterministic fixture; bounded repair only if configured; do not accept malformed output; add regression fixture.

## Vector index failure
Confirm canonical requirements in PostgreSQL; inspect index metadata/hash; reindex from authorized source records; verify source IDs; disclose degraded retrieval.

## Database outage
Check readiness, connection pool, storage and migrations. Avoid unsafe duplicate retries. Restore service and reconcile interrupted generation runs; never claim writes committed when they did not.

## Secret exposure
Revoke/rotate immediately, inspect safe audit/provider usage, remove from active files/history as appropriate, assess impact and add scanning/regression checks.

## Backup/restore and lifecycle
Document cadence, encrypted location, retention, RPO/RTO assumptions and owner. Perform isolated restore and verify projects, requirements, artifacts, prompts, evaluations and audit. Startup validates config/dependencies; shutdown stops accepting work, bounds in-flight calls and closes pools.
