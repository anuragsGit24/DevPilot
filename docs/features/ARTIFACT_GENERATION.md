# SDLC Artifact Generation

**Traceability:** UC-02–UC-07; FR-02–FR-07; SC-2–SC-7.

## Shared pipeline
Authorize source IDs → retrieve project-scoped context → select immutable prompt version → assemble schema-constrained prompt → invoke provider → parse → schema/domain validation → deterministic quality checks → persist AI-labelled draft and provenance → human review/edit/approve → export/evaluate. Invalid output must not be labelled valid.

Every artifact version records project/type, structured payload, version, source requirement IDs, parent/dependency IDs, status, AI flag, prompt/provider/model, generation run, warnings and timestamps.

## UC-02 User stories
Use “As a [role], I want [feature], so that [benefit].” Include ID, title, priority, category, dependencies, source requirement IDs, assumptions and optional complexity. Validate fields; flag likely duplicates/contradictions for review. Preserve history on edit/regeneration.

## UC-03 Acceptance criteria
Support Given-When-Then Gherkin or checklist. Link to parent story and source requirements. Cover positive, negative, edge/boundary cases where applicable. Do not invent business rules; label assumptions. Validate Gherkin structure or checklist schema.

## UC-04 Test cases
Each includes ID, description, category (functional/negative/boundary/edge/security), priority, preconditions, steps, safe test data, expected result, story IDs, criterion IDs and source IDs. Ensure unique IDs and report missing scenario categories. Never claim tests were executed unless run.

## UC-05 API specification
Generate OpenAPI 3.0 YAML/JSON with paths/methods, parameters, request/response schemas, headers, auth, examples and errors. Parse and validate before marking valid; preview/edit/export; trace to source stories/requirements.

## UC-06 Architecture recommendations
Analyze scalability, security, integrations, storage, batch/real-time and constraints. Include pattern, component/data-flow descriptions, security, deployment topology, technology options, rationale, alternatives, assumptions, risks and source links. Diagrams are drafts unless syntax-checked.

## UC-07 Sprint estimation
Inputs: stories, unit (points/hours), team capacity, velocity if known, priorities, dependencies and optional history. Output estimates/ranges, rationale, uncertainty, allocation, critical path, bottlenecks and assumptions. Never invent velocity; detect dependency cycles; allocation must respect declared capacity or explain conflict.

## Lifecycle and acceptance
Statuses: draft → in_review → accepted/rejected. Edits create revisions; regeneration never overwrites accepted history. Role authority to approve is a decision to confirm. Test schema, traceability, duplicates, contradictions, Gherkin, OpenAPI, dependency cycles, capacity constraints, provider failure and concurrent edits. Quality indicators should describe checks, not claim calibrated confidence.
