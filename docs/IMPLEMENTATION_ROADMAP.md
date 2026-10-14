# Implementation Roadmap

## Phases
| Phase | Weeks | Deliverables | Exit gate |
|---|---|---|---|
| P0 Clarify/bootstrap | 1 | Scope, backlog, ADRs, risk/data policy, CI plan | Decisions logged |
| P1 Foundation | 1–2 | React/FastAPI shell, DB/migrations, auth/RBAC, Compose, health checks | Clean startup and role tests |
| P2 Ingestion | 3–4 | Text/form/PDF/DOCX, review/edit/tag, persistence, vector index | SC-1 demonstrable |
| P3 Core generation | 5–7 | Provider adapter, prompts/RAG, stories, criteria, tests, OpenAPI | UC-02–05 validated |
| P4 Architecture/planning | 7–8 | Architecture recommendations, estimation, dependencies/sprints | UC-06–07 demonstrable |
| P5 Evaluation/prompt ops | 8–10 | Baselines, metrics, feedback, version performance/regression | SC-2/8/9 measured or gaps disclosed |
| P6 Dashboard/assistant/exports | 10–11 | Dashboard, assistant, formats and ZIP | UC-11/12/14 tested |
| P7 Hardening/case study | 11–13 | Case study, security/accessibility/performance, runbooks | CI and case-study evidence |
| P8 Final delivery | 13–14 | Report, demo video, presentation, evidence pack | SC matrix reviewed |

## Dependency sequence
Repository/CI and shared errors → identity/project scope → requirement persistence → provider interface and prompt version model → artifact schemas/traceability → generation → evaluation → exports/dashboard/assistant → case study and hardening.

## Milestones
M1 reproducible foundation; M2 ingestion; M3 story→criteria→tests traceability; M4 all artifact types; M5 baseline evaluation; M6 demo-ready release with evidence.

## Risk mitigation
Use fake provider in CI, keep one manageable provider fallback, freeze mandatory scope, defer bonus work, define API contracts early, reserve final two weeks for integration and evidence. Completion requires tests, authorization, docs, logs/metrics where relevant, accessibility review, and code review—not merely a visible demo.
