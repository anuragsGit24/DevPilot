# Test Plan

## Representative scenarios
| ID | Scenario | Expected result |
|---|---|---|
| T-ING-01 | Manual input | Normalized record persists with project/actor IDs |
| T-ING-02 | Valid PDF/DOCX | Text and available source locations extracted |
| T-ING-03 | Corrupt/empty/oversized upload | Safe recoverable error |
| T-SEC-01 | Cross-project read/export | Denied without data leakage |
| T-GEN-01 | Generate stories | Required fields and source links validate |
| T-GEN-02 | Duplicate/contradictory requirements | Warnings surfaced |
| T-AC-01 | Generate criteria | Positive/negative/edge coverage and valid structure |
| T-TC-01 | Generate tests | Required fields and parent links resolve |
| T-API-01 | Generate OpenAPI | YAML/JSON parses and OpenAPI 3.0 validator passes |
| T-ARCH-01 | Architecture output | Rationale, alternatives, assumptions and source links present |
| T-SPR-01 | Sprint allocation | Capacity respected; dependency cycle flagged |
| T-PROMPT-01 | Activate prompt | Permission, version history and audit enforced |
| T-EVAL-01 | Known baseline fixture | Expected metric values produced |
| T-DASH-01 | Dashboard | Counts reconcile; unauthorized data absent |
| T-EXP-01 | Export matrix | Parseable files and safe ZIP manifest |
| T-AUTH-01 | Login/reset/failed attempts | Rate limits and token lifecycle enforced |
| T-AI-01 | Assistant numeric query | Answer matches DB result and links evidence |
| T-AI-02 | Injection in uploaded content | Trusted policy preserved |
| T-OPS-01 | Provider timeout | Bounded retries; source input preserved |
| T-OPS-02 | Backup/restore | Restored integrity verified |
| T-A11Y-01 | Keyboard-only flow | Controls operable, focus visible, errors associated |

## Fixtures and execution
Version public/synthetic requirements, baseline artifacts, malformed files and contradiction/injection examples. Run lint/unit/integration/contract/security checks on PRs; full E2E and AI regression before release. Attach commit, environment, dataset, results and defects.

## Exit
No unresolved S0/S1 defects; mandatory flows pass; coverage target met or exception disclosed; OpenAPI/export checks pass; RBAC denial tests pass; traceability matrix updated; limitations documented.
