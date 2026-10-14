# Prompt Library Specification

## Minimum data model
Template: ID, name, description, artifact type, owner, tags, active-version pointer, timestamps. Version: template ID, version number, template content, variable schema, output schema version, changelog, creator/time, test status. Test run: sample/dataset version, output reference, metrics, provider/model and run metadata. Activation history is auditable.

## Lifecycle
`draft → validated/tested → active → retired`; rollback means reactivating a previously tested version. Versions are immutable. Activation is atomic; only authorized Admin in proposed baseline. Test a fixed sample set before activation.

## Import/export
Versioned JSON envelope. Validate file size, schema, artifact type, variables and content. Imports create inactive versions; never overwrite history or execute imported payloads. Exports exclude credentials and unrelated private run data.

## Performance
Associate each generation/evaluation with exact prompt version. Track schema-valid rate, metric distributions, sample count, latency, token/cost where available, failures and reviewer feedback. Distinguish missing data from a zero score.

## Acceptance
At least seven types (stories, criteria, tests, API specs, architecture, sprint plans, assistant) are supported; versions can be created/tested/activated/rolled back/imported/exported; history is auditable and comparisons reproducible.
