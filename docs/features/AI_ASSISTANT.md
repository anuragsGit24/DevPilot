# Conversational AI Assistant

**Traceability:** UC-14, FR-14, TO-2/TO-3/TO-10.

Support questions about story counts, sprint estimates, feature test cases, architecture rationale and acceptance-criteria gaps. Workflow: authenticate → select project → classify query → authorize → use deterministic DB queries for counts/status/estimates and scoped retrieval for synthesis → assemble prompt → call provider if needed → answer with supporting resource links and uncertainty.

Prefer SQL for numeric facts. If evidence is unavailable, say so. Never retrieve across unauthorized projects or claim an action succeeded without an authorized operation. Treat stored artifact text as untrusted; bound conversation history and retrieved context. Rate-limit and record safe latency/token/cost telemetry. Chat retention requires an explicit policy.

**Acceptance:** numeric answers match database facts; answers link to sources or disclose lack of evidence; cross-project tests fail safely; provider failures preserve prior artifacts and produce useful errors; AI responses are clearly labelled.
