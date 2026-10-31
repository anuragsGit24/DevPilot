"""Traceability engine (Engineer 4).

Bi-directional linking between source requirements and generated artifacts:
Requirement <-> User Story <-> Acceptance Criteria <-> Test Case <-> OpenAPI Endpoint,
with deterministic gap analysis (orphan requirements, speculative stories, and
dangling references). Pure logic — no database I/O.
"""
