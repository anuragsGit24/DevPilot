# Evaluation Methodology

## Dataset
Create versioned public/synthetic requirements paired with human-reviewed baselines. Include multiple complexity levels, ambiguity, edge cases and all artifact types. Separate tuning examples from held-out evaluation examples. Record source/license, reviewer, scope and version.

## Metrics
| Metric | Proposed approach | Limitation |
|---|---|---|
| Accuracy | Rubric score against baseline with explicit dimensions/denominator | Similarity is not absolute correctness |
| Completeness | Required elements/scenarios present divided by applicable elements | Checklist must be type-specific |
| Relevance | Human rating plus irrelevant/unsupported content flags | Adjudication may be needed |
| Format compliance | Deterministic schema/parser pass rate | Does not prove semantics |
| Consistency | Cross-artifact link/rule checks plus review | Semantic contradiction detection is imperfect |
| Hallucination | Unsupported claims flagged by source checks/review | Automated checks are incomplete |
| Estimate error | Absolute/relative difference from human estimates | Human estimates also vary |
| Effort reduction | `(manual time - assisted time) / manual time × 100%` | Task boundaries must match |

The source requires 70%+ user-story accuracy but does not define the formula. Agree on scale, weights, aggregation, sample size and adjudication before measuring. Do not change formula after seeing results without versioning and rerunning.

## Human/LLM review
Use a written rubric and calibrate reviewers. Report reviewer count and disagreement. LLM-as-judge is optional bonus, not ground truth; compare it with human ratings if used.

## Reproducibility and reporting
Persist dataset/baseline/version, generated version, prompt/provider/model, parameters, retrieval IDs, scorer version, raw values, notes and timestamps. Report per-type and aggregate metrics, sample counts, failures, latency/cost, representative successes/failures and limitations. Do not claim target attainment without evidence.
