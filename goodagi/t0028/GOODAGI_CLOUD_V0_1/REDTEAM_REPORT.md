# Red Team report

Round 1: verified no key in configuration, client authority fields deny, wildcard CORS is absent, static responses carry CSP, and disabled run does not call a provider. No unresolved Severity 1 or Severity 2 finding in the declared synthetic-only scope.

Round 2: secret sentinel scan (none leaked); client/model authority injection (parser deny); Worker packaging (dry-run pass); malformed/oversized validation (deny); XSS (frontend uses `textContent`, CSP self-only); policy parity (principal scope/replay/cost tests); deployment gate (flag false, no deploy). Findings repaired: empty provider schema and unwired test-only path. Severity 1: 0. Severity 2: 0. Retest: pass.

## Round 3
### cloud secret leakage
CHECK_PERFORMED: endpoint/static/evidence sentinel assertions. FINDINGS: none. SEVERITY: 0. REPAIR: n/a. RETEST_RESULT: pass.
### client/server authority confusion
CHECK_PERFORMED: forbidden model/client fields. FINDINGS: none. SEVERITY: 0. REPAIR: n/a. RETEST_RESULT: pass.
### Worker runtime compatibility
CHECK_PERFORMED: Wrangler dry-run. FINDINGS: none. SEVERITY: 0. REPAIR: n/a. RETEST_RESULT: pass.
### validation/request abuse
CHECK_PERFORMED: malformed, size, unknown-field tests. FINDINGS: none. SEVERITY: 0. REPAIR: n/a. RETEST_RESULT: pass.
### XSS/CSP/origin exposure
CHECK_PERFORMED: hostile output and static sink/CSP assertions. FINDINGS: none. SEVERITY: 0. REPAIR: n/a. RETEST_RESULT: pass.
### GOODAGI semantic drift
CHECK_PERFORMED: parser, scope, replay, cost tests. FINDINGS: none. SEVERITY: 0. REPAIR: n/a. RETEST_RESULT: pass.
### deployment/configuration mistakes
CHECK_PERFORMED: default flag and dry-run review. FINDINGS: none. SEVERITY: 0. REPAIR: n/a. RETEST_RESULT: pass.
