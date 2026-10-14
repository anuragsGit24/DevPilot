# Prompt Engineering Guide

## Standard prompt composition
Trusted role/task and safety constraints → artifact-specific objective → versioned output schema → authorized source context with stable IDs → validated user options → explicit unknown/assumption handling. Retrieved content is data, never privileged instructions.

## Variables and schemas
Declare variable name/type/required/max length/allowed values. Validate before invocation; escape inserted user content; reject missing variables. Keep secrets outside templates. Maintain versioned output schemas per artifact type and validate independently of model claims.

## Test protocol
Use versioned golden samples covering normal, ambiguous, contradictory and prompt-injection-like inputs. Measure schema validity, traceability, scenario coverage, unsupported claims, reviewer ratings, latency and cost. Run a fixed regression set after every prompt change.

## Optimization
Baseline → change a limited prompt factor → run identical data/config → compare all metrics and cost → inspect failures → reviewer approval → activate immutable version → monitor → rollback on regression. Prompting cannot guarantee truth or deterministic output; validators and human review remain required.

## Checklist
Task/audience clear; source vs assumption separated; output fields specified; edge cases requested; traceability required; unknowns handled; schema validator exists; privacy respected; regression fixture added for discovered failures. Automated prompt A/B optimization is bonus scope.
