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

## Data policy
Synthetic/public data only. Do not send real customer data, confidential banking requirements, proprietary source code or sponsor-confidential documents to model APIs. Record provider retention/training and region assumptions. The prototype is not approved for production banking use.

## Incident response
On secret exposure: revoke/rotate, inspect safe audit/provider usage, clean repository history where needed, assess impact and add regression checks. On cross-project exposure: disable affected route, preserve safe evidence, determine scope, add denial tests before re-enabling.
