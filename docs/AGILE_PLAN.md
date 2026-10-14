# Agile Delivery Plan

Use Scrum-inspired 1–2-week sprints with GitHub Projects or equivalent. Schedule is proposed for a 14-week maximum.

| Sprint | Weeks | Goal | Demo evidence |
|---|---|---|---|
| S0 | 1 | Scope, ADRs, repo/CI, risk register | Decisions/backlog |
| S1 | 2 | App skeleton, DB, auth, health | Clean startup and RBAC tests |
| S2 | 3–4 | Requirement ingestion | Manual + document input |
| S3 | 5–6 | Stories, criteria, test cases | Validated linked artifacts |
| S4 | 7–8 | OpenAPI, architecture, sprint planning | Validator and planning evidence |
| S5 | 9–10 | Prompt lifecycle and evaluation | Baseline metrics/regression |
| S6 | 11–12 | Dashboard, assistant, exports, case study | End-to-end demo |
| S7 | 13–14 | Hardening, report, presentation | Security/CI/performance evidence |

Priorities: P0 all UC-01–UC-14, SC-1–SC-15 and mandatory standards; P1 usability and richer diagnostics; P2 bonus innovations. Do not let bonuses displace mandatory work.

Planning must use actual team availability and observed velocity; do not invent velocity. Track planned/completed points, carry-over, cycle time, blockers, defects, coverage, CI pass rate, generation schema-valid rate, latency/cost, evaluation scores and effort reduction.

Ceremonies: planning, short daily async update, sprint demo/review, retrospective, backlog refinement. Record decisions and action owners.

Definition of Ready: source link, testable acceptance criteria, known dependencies, data/privacy classification, estimate, no blocking ambiguity. Definition of Done: PR review, tests, auth checks, docs/API schemas updated, logs/metrics where relevant, accessible UI review, evidence attached, no unresolved critical defect.
