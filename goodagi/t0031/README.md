# GOODAGI T0031 — Safety Kernel + Action Broker v0.1

This bounded core admits only a server-held explicit capability for deterministic `synthetic_read_only` actions. The sole agent-facing entry point is `ActionBroker.propose`; it invokes the kernel before the private executor boundary. There are no provider clients, network calls, credentials, or production tool handles.

Decision path: identity → task binding → capability scope → policy version → canonical SHA-256 action digest → approval binding → idempotency → decision receipt/evidence → synthetic executor.

Decision values are `ALLOW`, `REQUIRE_APPROVAL`, `DENY`, and `STOP`. Unknown/malformed/deferred work fails closed. An `ALLOW` requires an explicit server grant and is limited to synthetic read-only execution. T0032 owns full data/egress and budget controls; T0035 owns multi-agent channel isolation. See `ENFORCEMENT_MATRIX_V0_1.md`.

Run the isolated suite with `node --test tests/*.test.mjs` from this directory.
