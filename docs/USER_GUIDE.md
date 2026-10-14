# User Guide

This describes intended workflows; controls exist only after implementation.

## Ingest
Sign in and select an authorized project. Paste text, use a structured form, or upload supported PDF/DOCX. Review extraction and warnings; edit, tag, categorize and resolve duplicates before confirming. Never upload confidential banking requirements, real customer data or proprietary sponsor content.

## Generate/review
Select confirmed requirements and artifact type. Inspect sources/options, generate, then review schema checks, source links, assumptions and warnings. Stories need role/feature/benefit, priority and dependencies; criteria need positive/negative/edge coverage; tests need steps and expected results; OpenAPI must validate; architecture should show rationale/trade-offs; sprint plans must disclose capacity assumptions. AI outputs are drafts; approve only after human review.

## Evaluation and prompts
Pair generated revisions with human baselines; review metric formulas, samples and limitations; provide feedback. Authorized admins create immutable prompt versions, test them and activate only after configured checks.

## Dashboard/export/assistant
Dashboard metrics summarize stored records; missing data is not zero. Export a specific version and inspect the file. Ask assistant project questions and verify linked resources; if evidence is missing, do not assume the answer.

## Troubleshooting
Parse error: check file type/size/text and use manual input. Generation error: retain source and retry transient provider issue. Permission denied: check membership. Export failure should not change stored artifacts. DevPilot is a prototype and not a replacement for engineering judgment.
