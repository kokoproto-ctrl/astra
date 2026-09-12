# Implementation Coverage

`tests/kernel.test.mjs` has 40 implementation tests: 33 replayed T0030 negative cases and 7 core tests. The core cases cover positive explicit-capability allow, canonicalization/digest changes, approval mutation and replay, binding/capability/policy/malformed/deferred fail-closed behavior, idempotency, shutdown race, and evidence tampering.

Expected gate metrics from a passing suite:

| Metric | Result |
|---|---|
| T0030 negative cases | 33/33 pass |
| Unauthorized actions allowed | 0 |
| Positive allows | 1/1 pass |
| Decisions with reason/evidence | 100% |
| Allows with explicit capability | 100% |
| Action digest mismatch bypass | 0 |
| Duplicate effect executions | 0 |
| Undetected evidence integrity failures | 0 |
| Direct agent tool access paths | 0 |

The test executor is synthetic/read-only and reports `external_side_effect: false`.
