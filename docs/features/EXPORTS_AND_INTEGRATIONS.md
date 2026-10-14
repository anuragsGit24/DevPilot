# Exports and Integrations

**Traceability:** UC-12, FR-12, SC-12.

| Artifact | Required formats |
|---|---|
| User stories | Markdown, JSON, CSV |
| Acceptance criteria | Gherkin `.feature`, Markdown |
| Test cases | CSV, JSON, Markdown |
| API specifications | OpenAPI YAML, JSON |
| Architecture recommendations | Markdown, PDF |
| Sprint plans | JSON, CSV |
| Full project package | ZIP of selected artifacts plus manifest |

Select explicit artifact versions → authorize project → validate IDs → serialize → sanitize filename/archive paths → return correct MIME/content-disposition → audit export. ZIP manifest includes artifact IDs, versions, types, format and timestamp.

Mitigate CSV formula injection; validate OpenAPI; ensure PDF readability; reject absolute or `..` ZIP paths; do not export secrets or unauthorized records. Failed exports must not mutate canonical artifacts. Production Jira/Azure DevOps integration is out of scope; files are the handoff path.

**Acceptance:** parse/round-trip tests for every format; ZIP opens and contains manifest; each artifact has at least two formats; export is audited and access-controlled.
