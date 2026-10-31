# Security Architecture

## Identity
Use Argon2id or bcrypt; validate token signature, issuer, audience, expiry and active account; short-lived access tokens; safe refresh/revocation strategy; rate-limit login, reset, upload, assistant and generation. Reset tokens are random, hashed at rest, expiring, single-use and never logged. Enforce project membership and RBAC server-side.

## Threat model
| Threat | Control |
|---|---|
| IDOR/cross-project access | Project-scoped queries and denial tests |
| Prompt injection | Treat documents as untrusted; separate trusted instructions; no implicit tool authority |
| Data egress | Public/synthetic data only, minimum context, approved provider list |
| SQL injection/XSS | Parameterized SQL/ORM, safe rendering and output encoding |
| Malicious upload | Allowlist, size limits, parser timeouts, protected storage |
| Brute force | Rate limits, configurable failed-login threshold, uniform responses |
| Secret leakage | Environment/secrets manager, scanning and redaction |
| ZIP traversal/CSV formula injection | Safe archive paths and escaped spreadsheet-leading values |
| Cost abuse | Per-user/project quotas, bounded context/output tokens |
| Supply chain | Locked dependencies and vulnerability scans |

Use TLS in deployed environments, strict CORS, CSP and suitable security headers. Audit login, ingestion, edits, generation, approval, prompt changes, evaluation, export and admin actions. Exclude passwords, tokens, keys and unnecessary raw content from logs.

## Audit events
Every mutation and sensitive read goes through `app.core.audit.record_audit_log`, which stores the acting user, entity, optional client IP and a redacted `details` payload. Event names by domain:

- **Auth/access:** `USER_REGISTERED`, `USER_PROVISIONED`, `AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILED`, `AUTH_LOGIN_INACTIVE`, `AUTH_LOGIN_BLOCKED_LOCKOUT`, `AUTH_ACCOUNT_LOCKED`, `AUTH_LOGOUT`, `AUTH_PASSWORD_RESET_REQUEST`, `AUTH_PASSWORD_RESET_SUCCESS`, `USER_ROLE_CHANGED`, `USER_STATUS_TOGGLED`.
- **Projects/requirements/work items:** `PROJECT_CREATED`, `PROJECT_UPDATED`, `PROJECT_MEMBER_ADDED`, `REQUIREMENTS_INGESTED`, `WORK_ITEM_CREATED`, `WORK_ITEM_UPDATED`, `WORK_ITEM_DELETED`.
- **Generation/architecture/sprints:** `ARTIFACT_GENERATED`, `ARTIFACT_CREATED`, `ARTIFACT_VERSION_CREATED`, `ARTIFACT_STATUS_UPDATED`, `ARCHITECTURE_RECOMMENDED`, `SPRINTS_PLANNED`.
- **Quality, traceability & PromptOps (Engineer 4):** `EVALUATION_RUN`, `EVALUATION_VIEWED`, `TRACEABILITY_MATRIX_VIEWED`, `PROMPTS_SEEDED`, `PROMPT_VERSION_CREATED`, `PROMPT_REGRESSION_RUN`, `PROMPT_ACTIVATED`, `PROMPT_RETIRED`.

## Data policy
Synthetic/public data only. Do not send real customer data, confidential banking requirements, proprietary source code or sponsor-confidential documents to model APIs. Record provider retention/training and region assumptions. The prototype is not approved for production banking use.

## Incident response
On secret exposure: revoke/rotate, inspect safe audit/provider usage, clean repository history where needed, assess impact and add regression checks. On cross-project exposure: disable affected route, preserve safe evidence, determine scope, add denial tests before re-enabling.
