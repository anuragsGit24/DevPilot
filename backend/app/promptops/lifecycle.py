"""Prompt lifecycle state machine.

Allowed transitions: draft -> tested -> active -> retired (retired is terminal).
Functions raise IllegalPromptTransition for invalid hops, e.g. draft -> active.
"""
from __future__ import annotations

from app.models import PromptLifecycleState

allowed_transitions: dict[PromptLifecycleState, set[PromptLifecycleState]] = {
    PromptLifecycleState.draft: {PromptLifecycleState.tested},
    PromptLifecycleState.tested: {PromptLifecycleState.active},
    PromptLifecycleState.active: {PromptLifecycleState.retired},
    PromptLifecycleState.retired: set(),
}


class IllegalPromptTransition(ValueError):
    """Raised when a lifecycle state transition is not permitted."""


def transition(current: PromptLifecycleState, to: PromptLifecycleState) -> PromptLifecycleState:
    """Validate a requested lifecycle transition, returning the new state on success."""
    if to not in allowed_transitions.get(current, set()):
        raise IllegalPromptTransition(
            f"Prompt cannot transition from '{current.value}' to '{to.value}'; "
            f"allowed targets: {sorted(target.value for target in allowed_transitions.get(current, set()))} "
            f"(path must be draft -> tested -> active -> retired)."
        )
    return to


def can_transition(current: PromptLifecycleState, to: PromptLifecycleState) -> bool:
    return to in allowed_transitions.get(current, set())
