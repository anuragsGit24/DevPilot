# DevOps and CI/CD

Use Docker Compose for reproducible local/demo services and GitHub Actions as proposed CI. Never deploy to production banking environments.

## PR pipeline
1. Checkout and dependency setup.
2. Secret scan and dependency audit.
3. Backend lint/format/type checks.
4. Frontend lint/format/type checks.
5. Backend/frontend unit tests and coverage.
6. Integration and API contract tests.
7. OpenAPI/export validation and deterministic AI regression.
8. Build container images and apply quality gates.

## Main/release pipeline
Repeat gates → build versioned artifact → deploy to approved demo/staging only → health and smoke tests → capture release metadata and rollback plan. Failed required checks block merge/deploy.

## Source control
Feature branches, PRs, peer review, protected main, conventional commits, lockfiles, no direct main commits, no secrets, README/CONTRIBUTING/LICENSE decision and `.gitignore`.

## Gates
≥70% unit coverage target; no unresolved critical security findings; migrations/integration tests pass; generated OpenAPI validates; export serializers pass; prompt regression follows agreed thresholds; container health/smoke tests pass.

## Rollback
Keep prior image/tag and migration compatibility plan. Back up before destructive schema changes. Prefer forward-only migrations unless rollback is tested. Pipeline success is not equivalent to production readiness.
