# Model Provider Strategy

## Adapter contract
Accept normalized messages, schema/output mode, generation parameters, timeout and correlation ID. Return normalized content, provider/model, finish status, usage/cost where available, latency and normalized error category. Domain logic must not call vendor SDKs directly.

## Configuration
Provider/model, secret, timeout, retry count, token budgets, temperature, schema support, privacy classification and fallback allowlist are configurable. Store secrets in environment/secret manager, never source code or prompts.

## Retry/fallback
Retry only transient timeouts/rate limits/selected server failures using exponential backoff and jitter with bounded attempts. Do not blindly retry auth, validation or policy errors. Fallback only to explicitly approved compatible provider; record it and disclose relevant behavior. Use deterministic fake provider in CI.

## Privacy and cost
No confidential banking requirements, real customer data, proprietary sponsor documents or proprietary code sent to model APIs. Review provider retention/training/region terms. Send minimum context. Capture token usage and estimated cost when available; keep pricing dated/configurable. Bound context, output and per-user/project requests.

## Acceptance
At least one adapter works; provider failures normalize; provenance records model/provider; secrets never appear in logs; providers can be swapped without rewriting domain logic.
