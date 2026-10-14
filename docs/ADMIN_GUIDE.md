# Administrator Guide

## User/role administration
Provision or deactivate accounts through approved mechanisms. Assign least privilege and project membership. Verify changes with positive/negative tests. Review failed-login events without exposing credentials.

## Prompt lifecycle
Create immutable version → validate variables/schema → run standard regression set → inspect scores/failure examples → activate only if gate passes → monitor → rollback if needed. Audit activation. Never put keys in prompt text.

## Provider configuration
Set provider/model/key through secret configuration. Review retention/training/region terms, timeout, quota and fallback allowlist. Test with synthetic fixtures; do not silently switch provider. Monitor latency, failures, token usage and costs.

## Evaluation
Version baseline data, formulas, rubrics and scorers. Do not change accuracy formula after observing results without versioning and rerunning.

## Operations
Check readiness, errors, generation schema-valid rate, DB capacity, vector index, backups and CI state. Use the [runbook](OBSERVABILITY_AND_RUNBOOK.md). Verify restores periodically.

## Troubleshooting
Prompt activation blocked: inspect schema/regression. No retrieval: confirm index/source IDs. High costs: inspect budgets and request volume. Login threshold: follow cooldown/reset policy. Data mismatch: verify canonical DB before rebuilding vector index.
