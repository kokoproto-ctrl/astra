# GOODAGI Safety Invariants v0.1

These are normative T0030 requirements for T0031. `safety-invariants.v0.1.json` is canonical and carries rationale, failure behavior, related threats, and test IDs.

| ID | Statement | Severity | Failure behavior |
|---|---|---|---|
| INV-001 | Deny by default | CRITICAL | DENY |
| INV-002 | No direct agent tool access | CRITICAL | STOP |
| INV-003 | Task binding | CRITICAL | DENY |
| INV-004 | Principal binding | CRITICAL | DENY |
| INV-005 | Fixed capability scope | CRITICAL | DENY |
| INV-006 | Policy-version binding | CRITICAL | DENY |
| INV-007 | Exact-action approval digest | CRITICAL | REQUIRE_APPROVAL |
| INV-008 | Approval invalidation on change | CRITICAL | REQUIRE_APPROVAL |
| INV-009 | Human shutdown | CRITICAL | STOP |
| INV-010 | No policy self-modification | CRITICAL | DENY |
| INV-011 | Controlled communication envelope | HIGH | DENY |
| INV-012 | No hidden agent channel | HIGH | STOP |
| INV-013 | Budget hard limit | CRITICAL | STOP |
| INV-014 | Circuit breaker | CRITICAL | STOP |
| INV-015 | Secret non-disclosure | CRITICAL | DENY |
| INV-016 | Input egress guard | CRITICAL | DENY |
| INV-017 | Output egress guard | HIGH | DENY |
| INV-018 | Effect idempotency | CRITICAL | DENY |
| INV-019 | Evidence append-only | CRITICAL | STOP |
| INV-020 | Fail closed | CRITICAL | DENY |
| INV-021 | Recovery from committed state | CRITICAL | STOP |
| INV-022 | No unapproved external side effect | CRITICAL | REQUIRE_APPROVAL |

T0030 only verifies the specification and traceability. No production Safety Kernel or Action Broker is asserted or implemented.
