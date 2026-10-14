# Artifact Evaluation Framework

**Traceability:** UC-09, FR-09, SC-2/SC-7/SC-9/SC-15, TO-5.

## Workflow
Register baseline with source/license/version → validate baseline → select generated revision → run versioned scorers → persist scores/findings → human review and feedback → publish report → feed lessons into prompt changes → regression-test new versions.

## Metrics
Accuracy vs human baseline; completeness of required elements; relevance and unsupported content; format compliance; cross-artifact consistency; hallucination flags; human ratings; estimate error; manual-vs-assisted time. Each metric must define scale, formula, denominator, scorer version and limitations. Source does not specify exact accuracy formula: confirm before scoring. User-story target is 70%+ against human baseline; do not claim attainment without evidence.

## Safeguards
Use versioned public/synthetic baseline data. Compare equivalent scope/granularity. Keep tuning data separate from held-out evaluation. Calibrate reviewers and report disagreement if feasible. LLM-as-judge is optional bonus and never sole ground truth. Persist prompt/model/source IDs, baseline, method version, scores, notes and timestamps.

## Acceptance
SC-9 metrics available for every artifact type; SC-2 report includes formula, sample count, baseline and score; sprint estimates compared with human estimates; human feedback persists; prompt regressions are detected by agreed thresholds. Missing metrics are marked unavailable, not zero.
