# Project Charter

## Vision
Deliver a model-agnostic, API-first SDLC co-pilot that converts business requirements into structured, traceable engineering artifacts with human review and baseline-based evaluation.

## Business objectives
BO-1 reduce documentation effort; BO-2 improve consistency/completeness; BO-3 support non-technical stakeholders; BO-4 accelerate test planning; BO-5 provide reasoned architecture guidance; BO-6 assist sprint planning; BO-7 measure 70%+ accuracy against human baselines; BO-8 maintain reusable prompts.

## Technical objectives
TO-1 React + Python; TO-2 provider-agnostic LLM integration; TO-3 vector-based RAG; TO-4 versioned prompts; TO-5 baseline evaluation; TO-6 secure API-first auth; TO-7 CI/CD; TO-8 comprehensive docs; TO-9 open-source case study; TO-10 AI-pipeline observability.

## Stakeholders
PM validates stories/estimates; BA ingests/refines requirements; Developer reviews API/architecture artifacts; Tester reviews cases/coverage; Engineering Lead reviews architecture and quality; Admin manages access/prompts/configuration; academic team implements and presents. Sponsor approval is not implied.

## Scope
Mandatory: UC-01–UC-14 and SC-1–SC-15 in the source use case, specified engineering standards, case study, exports, evaluation, and final deliverables. Exclusions: code generation, live collaboration, production Jira/Azure DevOps, custom fine-tuning, production banking deployment, confidential/customer data, generated API deployment, external-repository live CI/CD.

## Constraints and assumptions
12–14 weeks; limited student capacity and model budget; synthetic/public datasets only; human baselines must be available; provider and hosting decisions remain open. Performance and 70% accuracy are targets to test, not guarantees.

## Risks
LLM hallucinations → source links, validators, human review. Scope creep → prioritize mandatory use cases. Provider cost/latency → token budgets, timeouts, fake provider tests. Baseline inconsistency → rubric and reviewer calibration. Data egress → approved provider and public/synthetic data. Integration delays → API contracts and fixtures early.

## Exit criteria
All success criteria mapped to evidence; core end-to-end workflows demonstrated; security/accessibility/performance limitations reported; CI and test evidence collected; case study, final report, presentation, and demo video delivered.

## Decisions requiring confirmation
Provider/model and data-processing terms; open-source case-study project; team capacity/velocity; reset-email capability; evaluation formula and weights; hosting target; final role matrix.
