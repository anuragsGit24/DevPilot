# Requirements Traceability Matrix

This is a planned map. Evidence remains pending until implementation/testing.

## Use-case mapping
| Source | Requirement | Specification | Planned evidence |
|---|---|---|---|
| UC-01 | Requirement ingestion | [Ingestion](features/REQUIREMENT_INGESTION.md) | Manual/upload tests, parser fixtures, persistence |
| UC-02–UC-07 | Stories, criteria, tests, OpenAPI, architecture, sprint planning | [Generation](features/ARTIFACT_GENERATION.md) | Schema, traceability, coverage, OpenAPI and planning tests |
| UC-08 | Prompt library | [Prompt library](features/PROMPT_LIBRARY.md) | Version/activation/import/export tests |
| UC-09 | Evaluation | [Evaluation](features/EVALUATION_FRAMEWORK.md) | Baseline dataset, metrics, human feedback |
| UC-10 | Case study | [Case study](features/CASE_STUDY.md) | Reproducible report and comparisons |
| UC-11 | Dashboard | [Dashboard](features/PROJECT_DASHBOARD.md) | Reconciliation and performance tests |
| UC-12 | Export/integration | [Exports](features/EXPORTS_AND_INTEGRATIONS.md) | Format parsing and ZIP tests |
| UC-13 | Authentication/RBAC | [Auth](features/AUTHENTICATION_AND_RBAC.md) | Role matrix, reset and denial tests |
| UC-14 | Contextual assistant | [Assistant](features/AI_ASSISTANT.md) | Grounded answer and cross-project isolation tests |

## Success criteria from source section 13
| ID | Required evidence | Status |
|---|---|---|
| SC-1 | Manual input + document upload demonstrated | Pending |
| SC-2 | User-story accuracy ≥70% vs human baseline, with defined formula | Pending |
| SC-3 | Gherkin criteria cover positive/negative/edge cases | Pending |
| SC-4 | Test cases link to stories and criteria | Pending |
| SC-5 | OpenAPI 3.0 validator report | Pending |
| SC-6 | Architecture rationale and relevance review | Pending |
| SC-7 | Estimates compared with human estimates | Pending |
| SC-8 | ≥7 artifact types with prompt versioning/performance | Pending |
| SC-9 | Accuracy, completeness, relevance metrics for all artifact types | Pending |
| SC-10 | Open-source case study with documented results | Pending |
| SC-11 | ≥3 roles; target all five listed roles | Pending |
| SC-12 | Every artifact exports to ≥2 standard formats | Pending |
| SC-13 | CI build/test/scan/deploy evidence | Pending |
| SC-14 | Complete professional documentation | Drafted; review pending |
| SC-15 | Measured documentation-effort reduction | Pending |

## Engineer 4 — Quality, Traceability & PromptOps endpoints

Phase P5 (Owner: Engineer 4). These endpoints are implemented in the backend and
covered by the test suite; they are the machine-readable evidence behind UC-08,
UC-09 and SC-2/SC-4/SC-8/SC-9. Full request/response contracts live in
[API_SPECIFICATION.md](API_SPECIFICATION.md).

| Endpoint | Purpose | Evidence (test) |
|---|---|---|
| `GET /projects/{project_id}/traceability/matrix` | Build the PRD ↔ story ↔ criteria ↔ test ↔ OpenAPI matrix; report coverage and gaps | `tests/test_traceability_matrix.py` |
| `POST /projects/{project_id}/evaluations/run` | Run completeness/groundedness/consistency rubrics and persist the result | `tests/test_evaluations_api.py`, `tests/test_rubrics.py` |
| `GET /projects/{project_id}/evaluations` | List past evaluation runs (bounded `limit`/`offset`) | `tests/test_evaluations_api.py` |
| `GET /projects/{project_id}/evaluations/{evaluation_id}` | Read a saved evaluation result | `tests/test_evaluations_api.py` |
| `GET /prompts?project_id={project_id}` | List prompts and immutable revisions | `tests/test_promptops.py` |
| `POST /prompts/seed?project_id={project_id}` | Idempotently seed canonical prompt templates | `tests/test_promptops.py` |
| `POST /prompts/{prompt_id}/versions` | Add a checksum-deduplicated prompt revision | `tests/test_promptops.py` |
| `POST /prompts/{prompt_id}/versions/{version_number}/regression` | Run the deterministic prompt regression suite | `tests/test_promptops.py` |
| `POST /prompts/{prompt_id}/versions/{version_number}/activate` | Activate a tested revision (`draft → tested → active`) | `tests/test_promptops.py` |
| `POST /prompts/{prompt_id}/versions/{version_number}/retire` | Retire a prompt (terminal state) | `tests/test_promptops.py` |

Rubric definitions (weights, thresholds and formulas) are pinned in
`backend/app/evaluations/dimensions.py` and documented in
[features/EVALUATION_FRAMEWORK.md](features/EVALUATION_FRAMEWORK.md). Each
evaluation persists its dimension scores, weighted overall score, coverage
metrics, grounding method and actionable issue records, so UC-09 evidence is
reproducible from the stored row rather than from a design claim.

## Other traceability
BO-1–BO-8: PRD, evaluation and prompt library. TO-1–TO-10: architecture, AI pipeline, security, DevOps, observability and final deliverables. SDLC/Agile/source-control standards: `AGILE_PLAN.md`, `ADRS.md`, `TEST_STRATEGY.md`, `SECURITY_CHECKLIST.md`, `DEVOPS_AND_CICD.md`.

For each evidence item record commit/tag, date, environment, dataset/version, procedure, expected/observed result, reviewer and limitations. Design docs alone do not prove a criterion passed.
