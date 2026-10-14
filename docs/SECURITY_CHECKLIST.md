# Security Checklist

## Identity/access
- [ ] Argon2id/bcrypt password hashing; no plaintext.
- [ ] Token signature, issuer, audience, expiry and account status checked.
- [ ] Server-side RBAC and project scope on every route.
- [ ] IDOR tests cover read/edit/generation/assistant/dashboard/export.
- [ ] Login/reset/upload/generation rate limits and configurable failed-login threshold.
- [ ] Reset tokens hashed, expiring, single-use and not logged.

## Inputs/outputs
- [ ] Request schemas and domain validation.
- [ ] Upload allowlist, size limit, safe filenames, parser timeouts and protected storage.
- [ ] Parameterized SQL/ORM; safe Markdown/HTML rendering.
- [ ] CSV formula injection and ZIP traversal mitigated.
- [ ] Prompt injection/untrusted retrieval tests.
- [ ] Invalid AI schema cannot be marked valid.
- [ ] Safe errors contain no stack traces, SQL, filesystem paths or secrets.

## Secrets/network/provider
- [ ] `.env` excluded; `.env.example` has placeholders.
- [ ] Secret/dependency scanning runs in CI.
- [ ] TLS, strict CORS, CSP and suitable security headers.
- [ ] Provider allowlist/data policy reviewed; only public/synthetic data egress.
- [ ] Logs redact keys, tokens, reset links and sensitive headers.

## Data/operations
- [ ] Audit covers ingestion, edits, generation, approval, prompts, evaluation, export and admin.
- [ ] Retention/deletion policy for files and chat history.
- [ ] Backup/restore tested; provider/vector outage behavior documented.
- [ ] No unresolved critical/high security findings at release, or exception is explicit and approved.
