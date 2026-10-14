# Project Dashboard

**Traceability:** UC-11, FR-11.

Display project status, artifact counts by type/state, quality scores and trends, recent activity, evaluation summaries, baseline coverage, prompt version usage and performance, latency and token/cost where available.

Queries must be project-scoped. Filters may include project/date/type/status. Empty metrics must be “no data,” not zero. Aggregates come from stored records and must not trigger LLM calls. Link metrics to reports, prompt versions and sample counts.

Target render time <3 seconds on a representative dataset; index queries, paginate activity and avoid N+1 patterns. Ensure semantic headings, accessible chart summaries, keyboard filters and non-color-only status cues.

**Acceptance:** counts reconcile to canonical records; trends are filterable; reports link to source versions; cross-project access is denied; performance is measured rather than assumed.
