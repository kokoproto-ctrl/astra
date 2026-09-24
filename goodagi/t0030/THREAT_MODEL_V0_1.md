# GOODAGI Threat Model v0.1

Status: specification baseline for T0031; it is not a claim of current production enforcement. The canonical machine-readable records, including every required field, are in `threat-model.v0.1.json`.

| ID | Threat | Severity | Primary invariants | Negative test |
|---|---|---|---|---|
| THR-001 | Direct prompt injection | CRITICAL | INV-001, INV-020 | NEG-001 |
| THR-002 | Indirect prompt injection | CRITICAL | INV-001, INV-016, INV-020 | NEG-002 |
| THR-003 | Privilege escalation | CRITICAL | INV-004, INV-005, INV-020 | NEG-003 |
| THR-004 | Capability escalation | CRITICAL | INV-001, INV-005, INV-020 | NEG-004 |
| THR-005 | Direct tool bypass | CRITICAL | INV-002, INV-022 | NEG-005 |
| THR-006 | Unauthorized side effect | CRITICAL | INV-007, INV-022, INV-020 | NEG-006 |
| THR-007 | Approval bypass | CRITICAL | INV-007, INV-020 | NEG-007 |
| THR-008 | Approval TOCTOU | CRITICAL | INV-007, INV-008, INV-020 | NEG-008 |
| THR-009 | Secret exfiltration | CRITICAL | INV-015, INV-016, INV-017 | NEG-009 |
| THR-010 | Data or prompt exfiltration | CRITICAL | INV-003, INV-016, INV-017 | NEG-010 |
| THR-011 | Unsafe output egress | HIGH | INV-017, INV-020 | NEG-011 |
| THR-012 | Hidden agent communication | HIGH | INV-011, INV-012 | NEG-012 |
| THR-013 | Agent collusion | HIGH | INV-003, INV-004, INV-011, INV-013 | NEG-013 |
| THR-014 | Task boundary escape | CRITICAL | INV-003, INV-020 | NEG-014 |
| THR-015 | Cross-task contamination | HIGH | INV-003, INV-021 | NEG-015 |
| THR-016 | Goal drift | HIGH | INV-003, INV-005, INV-022 | NEG-016 |
| THR-017 | Runaway loop | HIGH | INV-009, INV-013, INV-014 | NEG-017 |
| THR-018 | Retry storm | HIGH | INV-013, INV-014 | NEG-018 |
| THR-019 | Budget exhaustion | HIGH | INV-013, INV-014 | NEG-019 |
| THR-020 | Stale state | CRITICAL | INV-006, INV-008, INV-020 | NEG-020 |
| THR-021 | Duplicate execution | CRITICAL | INV-018, INV-020 | NEG-021 |
| THR-022 | Replay attack | CRITICAL | INV-007, INV-018, INV-020 | NEG-022 |
| THR-023 | Forged evidence | HIGH | INV-004, INV-019, INV-020 | NEG-023 |
| THR-024 | Evidence tampering/deletion | HIGH | INV-019, INV-020 | NEG-024 |
| THR-025 | Crash/restart inconsistency | CRITICAL | INV-018, INV-021, INV-020 | NEG-025 |
| THR-026 | Provider failure/timeout | HIGH | INV-018, INV-020, INV-021 | NEG-026 |
| THR-027 | Policy-version mismatch | CRITICAL | INV-006, INV-020 | NEG-027 |
| THR-028 | Identity confusion | CRITICAL | INV-004, INV-020 | NEG-028 |
| THR-029 | Confused deputy | CRITICAL | INV-003, INV-004, INV-005, INV-020 | NEG-029 |
| THR-030 | Unsafe delegation | HIGH | INV-004, INV-005, INV-011 | NEG-030 |
| THR-031 | Compromised agent output | CRITICAL | INV-001, INV-002, INV-020, INV-022 | NEG-031 |
| THR-032 | Unsafe recovery | HIGH | INV-021, INV-020 | NEG-032 |
| THR-033 | Operator UI/action mismatch | CRITICAL | INV-007, INV-008, INV-022 | NEG-033 |

All CRITICAL/HIGH entries specify mitigation, detection, residual risk, and future owner task T0031 in the canonical JSON. Trust boundaries covered include untrusted input/retrieval, agent-to-broker, approval-to-execution, task state, evidence, recovery, and outbound provider/service egress.
