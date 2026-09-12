# Negative Test Matrix v0.1

The canonical matrix is `negative-test-matrix.v0.1.json`. It contains one negative test per identified threat (33 total); all tests forbid side effects and resolve only to `DENY`, `STOP`, or `REQUIRE_APPROVAL`.

Coverage: CRITICAL threats 20/20, HIGH threats 13/13, CRITICAL invariants 19/19. `tests/spec-contract.test.mjs` validates this matrix as a specification contract; it does not exercise a future production broker.

The matrix explicitly exercises deny-by-default, direct-tool denial, task/principal/capability binding, exact-action digest and invalidation, shutdown/budget/circuit behavior, secret and output egress controls, idempotency/replay, evidence integrity, committed-only recovery, policy version, identity/confused deputy, delegation, and UI/digest mismatch.
