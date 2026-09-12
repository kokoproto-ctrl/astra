# Round 2 — Red Team final report

Rechecked executor bypass, forged/missing capability, confused deputy, digest canonicalization, approval TOCTOU/replay, duplicate effect, stale policy, shutdown race, evidence tampering, malformed input, unavailable guards, and always-deny behavior. All 33 inherited negative cases and one explicit allow case are executed by the deterministic suite.

`OPEN_CRITICAL=0`; `OPEN_HIGH=0`. Full egress/budget and multi-agent controls remain explicitly fail-closed/deferred, not claimed complete.
