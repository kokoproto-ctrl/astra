# Red Team report

Round 1: verified no key in configuration, client authority fields deny, wildcard CORS is absent, static responses carry CSP, and disabled run does not call a provider. No unresolved Severity 1 or Severity 2 finding in the declared synthetic-only scope.

Round 2: secret sentinel scan (none leaked); client/model authority injection (parser deny); Worker packaging (dry-run pass); malformed/oversized validation (deny); XSS (frontend uses `textContent`, CSP self-only); policy parity (principal scope/replay/cost tests); deployment gate (flag false, no deploy). Findings repaired: empty provider schema and unwired test-only path. Severity 1: 0. Severity 2: 0. Retest: pass.
