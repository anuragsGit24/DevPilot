# Test Strategy

## Levels
- Unit: domain rules, validators, permission policy, prompt rendering, metrics, serializers (pytest/React Testing Library).
- Integration: PostgreSQL/migrations, vector adapter, file parsing, provider adapter, exports.
- API contract: request/response/error behavior and OpenAPI validation.
- E2E: login → ingest → generate → review → evaluate → export (Playwright).
- Security: RBAC/IDOR, injection, upload abuse, rate limits, secret leakage.
- Accessibility: keyboard, labels, focus, contrast, error announcements.
- AI quality: schemas, traceability, baseline metrics, hallucination flags, prompt regression.
- Performance/recovery: API/dashboard/AI timing, provider/vector/DB failure, backup restore.

## Coverage
Unit-test coverage target ≥70%; report exclusions and untested critical modules. Coverage alone does not prove quality. Use synthetic reproducible datasets and deterministic fake provider in CI.

## Defect severity
S0 critical: cross-project exposure, secret leak, auth bypass, data corruption. S1 high: mandatory workflow blocked, invalid OpenAPI falsely marked valid, broken traceability/data loss. S2 medium: degraded feature with workaround. S3 low: cosmetic issue.

## Evidence
Retain CI run, commit, environment, fixture/dataset version, coverage, pass/fail, defects and reviewer. Never fabricate evidence.
