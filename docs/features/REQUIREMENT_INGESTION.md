# Requirement Ingestion

**Traceability:** UC-01, FR-01, SC-1, TO-3, NFR-07/NFR-09.

## Workflow
Authorize user/project → accept manual text/form or PDF/DOCX → validate format/size → store upload metadata and protected bytes → parse text and source locations → extract candidate requirements, entities, constraints and business rules → show review UI → user edits/tags/categorizes/merges/splits → persist confirmed records → index chunks with project/source IDs → report indexing status.

## Rules
Manual input and document upload are needed for SC-1; broader scope includes PDF and DOCX. Validate MIME and content, not only extension. Bound size, page count, text length and parser runtime. Empty extraction is recoverable and should offer manual entry. Preserve checksum and source location. Duplicates are suggestions, not silent deletions. A vector outage must not lose canonical requirements; reindexing must be possible. Uploaded text is untrusted data, not privileged instructions.

## Failure/security
Handle corrupt/encrypted/empty files, scanned PDFs without OCR, oversized uploads, parser exceptions, DB/vector outage and permission denial. Display actionable safe errors with request ID; do not expose paths or stack traces. Store outside public web root and authorize downloads. Use only public/synthetic data.

## Acceptance
Manual and document inputs work; PDF/DOCX fixtures pass; extracted requirements are editable/taggable before confirmation; confirmed records persist with source IDs; parser failures are recoverable; indexing can be rebuilt; audit captures ingestion and edits.

## Open decisions
OCR, size limits, file storage adapter, taxonomy, parser libraries and retention/deletion policy.
