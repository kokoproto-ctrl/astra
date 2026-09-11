# Architecture

`LLM adapter -> schema-validated proposal -> ControlBoundary.decide -> synthetic object mutation -> append-only evidence`.

The adapter receives no host tools, filesystem capability, network capability, or boundary state mutation handle. The boundary is default-deny and binds principal, task, action, object, policy version, budget, and principal-scoped idempotency key before a synthetic effect is committed.

This v0.1 implementation uses logical principals. Distinct OS UIDs are not available on this Windows host and therefore are not claimed.
