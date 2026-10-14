# Product Requirements Document

## Product boundary
DevPilot generates drafts and recommendations for human review. It does not replace engineering judgment or generate application code from requirements.

## Personas
Product Manager, Business Analyst, Developer, Tester, Engineering Lead, Platform Administrator. RBAC roles explicitly listed by source: Admin, PM, BA, Developer, Tester. Confirm mapping for Engineering Lead.

## Functional requirements
| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Text/form/PDF/DOCX ingestion, parsing, editing, tagging, categorization, persistence | Must |
| FR-02 | Traceable user stories with priority/category/dependencies and duplicate/contradiction checks | Must |
| FR-03 | Gherkin/checklist acceptance criteria with positive, negative and edge cases | Must |
| FR-04 | Test cases with IDs, preconditions, steps, expected results, priority/category and traceability | Must |
| FR-05 | Valid OpenAPI 3.0 YAML/JSON with paths, schemas, auth, headers, examples and errors | Must |
| FR-06 | Architecture options, diagrams/data flows, security/deployment rationale and alternatives | Must |
| FR-07 | Estimates and sprint allocations using dependencies, capacity and velocity when provided | Must |
| FR-08 | Prompt templates, immutable versions, testing, activation, import/export and metrics | Must |
| FR-09 | Baseline evaluation, quality metrics, hallucination checks and human feedback | Must |
| FR-10 | Open-source end-to-end case study with baseline comparison | Must |
| FR-11 | Dashboard status, counts, trends, activity, evaluations and prompt performance | Must |
| FR-12 | Markdown, JSON, CSV, Gherkin, OpenAPI YAML/JSON, PDF and ZIP exports | Must |
| FR-13 | Auth, RBAC, secure tokens/password reset, failed-login controls and audit | Must |
| FR-14 | Contextual assistant over authorized project data | Must |

## Non-functional requirements
| ID | Target | Verification |
|---|---|---|
| NFR-01 | UI load <2 s | Reproducible browser benchmark |
| NFR-02 | Non-AI API <500 ms | Load test with percentile/environment reported |
| NFR-03 | Standard AI generation <30 s | End-to-end timing |
| NFR-04 | Dashboard render <3 s | Representative dataset benchmark |
| NFR-05 | ≥99% demo/test availability | Declared observation window |
| NFR-06 | Stateless API, containerized, horizontally scalable design | Architecture/deployment review |
| NFR-07 | No loss of accepted data; recoverable parser/provider failures | Failure injection |
| NFR-08 | RBAC, TLS, secrets, validation, OWASP controls, audit | Security tests |
| NFR-09 | Public/synthetic data only; minimize model egress | Configuration/review |
| NFR-10 | Modular, testable, maintainable architecture | Review and automated checks |
| NFR-11 | Responsive, keyboard usable, WCAG 2.1 AA target | Automated + manual audit |
| NFR-12 | Explainability/quality indicators where meaningful | Output review |
| NFR-13 | JSON logs, health checks, tracing, cost telemetry, backups/runbooks | Ops review |
| NFR-14 | ≥70% unit coverage target plus integration/E2E/security/AI tests | CI evidence |

## Core journeys
Ingest → review/edit/tag → confirm → generate artifact → validate → human review → persist version → export/evaluate. Admin creates prompt version → tests → activates → monitors/rolls back. Evaluator pairs generated revision with baseline → scores → reviews → stores report. Assistant retrieves authorized context and cites supporting artifacts.

## Business rules
Every artifact belongs to a project and has version/provenance. AI output is labelled draft until human approval. Traceability uses stable IDs. Duplicate/contradiction checks are advisory unless deterministic. Estimates disclose assumptions; never invent velocity. Server enforces permissions. Logs exclude secrets. Evaluation reports metric method, dataset, version and sample count.

## Edge cases
Corrupt/scanned/encrypted PDF; unsupported/oversized file; empty extraction; contradictory requirements; no retrieval context; provider timeout/rate limit; malformed JSON/YAML; dependency cycle; invalid prompt variables; missing baseline; export with no records; cross-project assistant query; concurrent edits.

## Scope labels
Mandatory: UC-01–UC-14, SC-1–SC-15, security/engineering standards. Implementation choices: exact DB/vector store/provider/parser/hosting and metric formula. Bonus: multi-LLM comparison, advanced RAG, interactive refinement, traceability visualization, natural-language diagrams, scaffolding, LLM-as-judge, prompt A/B tests, voice input, cloud-native deployment. Production integrations/collaboration remain excluded.
