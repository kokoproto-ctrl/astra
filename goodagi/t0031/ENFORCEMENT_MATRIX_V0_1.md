# T0031 Enforcement Matrix

| Invariant | Status | T0031 mechanism |
|---|---|---|
| INV-001 | ENFORCED_T0031 | Missing/invalid grant denies |
| INV-002 | ENFORCED_T0031 | Broker-only private executor reference |
| INV-003 | ENFORCED_T0031 | Grant task binding |
| INV-004 | ENFORCED_T0031 | Grant principal binding |
| INV-005 | ENFORCED_T0031 | Server-held action/scope/object grant |
| INV-006 | ENFORCED_T0031 | Exact policy version validation |
| INV-007 | ENFORCED_T0031 | Canonical SHA-256 digest-bound approval |
| INV-008 | ENFORCED_T0031 | Digest and all bindings revalidated |
| INV-009 | ENFORCED_T0031 | Shutdown latch checked before authorization |
| INV-010 | ENFORCED_T0031 | Policy/invariant mutation action names denied |
| INV-011 | FAIL_CLOSED_PENDING_T0035 | No multi-agent messaging is enabled |
| INV-012 | FAIL_CLOSED_PENDING_T0035 | Non-broker action/message proposal denies |
| INV-013 | FAIL_CLOSED_PENDING_T0032 | No budgeted/effectful class can pass |
| INV-014 | FAIL_CLOSED_PENDING_T0032 | Deferred execution classes deny |
| INV-015 | FAIL_CLOSED_PENDING_T0032 | Sensitive egress class denies pending guard |
| INV-016 | FAIL_CLOSED_PENDING_T0032 | Non-synthetic outbound class denies |
| INV-017 | FAIL_CLOSED_PENDING_T0032 | Non-synthetic output class denies |
| INV-018 | ENFORCED_T0031 | Scoped effect ledger rejects repeat |
| INV-019 | ENFORCED_T0031 | Hash-chained append-only evidence verification |
| INV-020 | ENFORCED_T0031 | Validation exceptions and unavailable guards deny/stop |
| INV-021 | EXTERNAL_CONTROL_PLANE | T0031 refuses recovery actions; committed checkpoint promotion remains ASTRA-controlled |
| INV-022 | ENFORCED_T0031 | Anything effectful requires unavailable guard and denies |

No deferred item is claimed as fully implemented.
