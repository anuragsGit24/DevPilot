# Authentication and RBAC

**Traceability:** UC-13, FR-13, SC-11, TO-6.

Roles: Admin, Project Manager, Business Analyst, Developer, Tester. Target all five although SC-11 requires at least three. Engineering Lead is a source stakeholder, not one of the five RBAC roles; confirm role mapping.

| Capability | Admin | PM | BA | Developer | Tester |
|---|---|---|---|---|---|
| Users/global config | Yes | No | No | No | No |
| Create/manage projects | Yes | Yes | No | No | No |
| Ingest/edit requirements | Yes | Yes | Yes | Read | Read |
| Generate artifacts | Yes | Yes | Yes | Yes | Yes |
| Manage prompt versions/activate | Yes | No | No | No | No |
| Evaluate artifacts | Yes | Yes | Yes | Read | Yes |
| Dashboard/export | Yes | Yes | Yes | Yes | Yes |

Proposed matrix only; confirm before implementation.

Use Argon2id/bcrypt, short-lived validated tokens or approved secure sessions, server-side project-scoped authorization, rate limits, configurable failed-login threshold/cooldown, generic login/reset responses and audit. Reset tokens are random, hashed, expiring and single-use; never log them. Role changes and sensitive actions are audited.

**Acceptance:** unauthenticated calls return 401; forbidden operations are denied; cross-project IDs cannot leak data; reset tokens cannot be reused; role matrix has positive/negative tests; logs exclude secrets.
