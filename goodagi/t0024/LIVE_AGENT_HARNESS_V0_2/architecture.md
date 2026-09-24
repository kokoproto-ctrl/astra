# Architecture

`agent process -> loopback IPC -> boundary process -> ControlBoundary.decide -> synthetic object mutation -> append-only evidence`.

The boundary process is the sole owner of budgets, effect registry, object state, and policy state. Agent child processes are given only a loopback endpoint and structured request data; they receive no JavaScript reference to boundary state. The boundary is default-deny and binds principal, task, action, object, policy version, a server-side action-cost table, and principal-scoped idempotency key before a synthetic effect is committed. Agent-supplied `cost` is rejected.

This v0.1 implementation uses logical principals. Distinct OS UIDs are not available on this Windows host and therefore are not claimed.
