# Deployment Guide

## Prerequisites
Git, Docker Engine/Compose, Node.js LTS, pinned Python version, PostgreSQL/vector service, and approved model provider or local model.

## Environment groups
App environment/allowed origin; DB connection; vector persistence; JWT signing/issuer/audience/expiry; provider/model/key/timeout/retries/token limits; file storage/upload limits; rate limits; logging/telemetry; reset-mail adapter; cost-rate configuration. Put placeholders only in `.env.example`; never commit `.env` or secrets.

## Local procedure (commands finalized after implementation)
1. Clone and inspect README/ADRs.
2. Copy `.env.example` to `.env` and add local values.
3. Start Compose services.
4. Apply versioned migrations.
5. Seed synthetic demo users/data only.
6. Start UI/API using project scripts.
7. Verify live/ready health, login/RBAC, ingestion, generation, and export.
8. Run test suite and record commit/environment.

## Demo deployment
Deploy only to approved academic/demo environment. Restrict ingress, use TLS, inject secrets externally, enable health checks and load only public/synthetic data. Run smoke tests after deployment.

## Rollback
Stop rollout on failed smoke tests; return to prior compatible image; follow migration recovery plan; restore backups only after impact assessment. Do not imply these steps have been tested until evidence exists.

## Verification
Clean setup, correct readiness, denied unauthorized access, full generation/review/export path, OpenAPI validation, redacted structured logs, backup/restore evidence and measured performance targets.
