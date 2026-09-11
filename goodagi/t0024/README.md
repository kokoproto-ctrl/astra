# GOODAGI T0024 — LIVE_AGENT_HARNESS_V0_1_1

This audit-repair commit records `LIVE_AGENT_HARNESS_V0_1_1` and local evidence for `GOODAGI_001/T0024`.

## Architecture

Each agent process can only emit a structured request proposal over loopback IPC. The separate boundary process owns all budgets, effects, object state, and policy state; it performs default-deny policy checks, principal/task/action/object binding, server-side action-cost validation, policy-version validation, idempotency/replay validation, and the only synthetic effect commit. Agent-supplied cost is rejected.

## Run

Use the bundled Node runtime, then from `LIVE_AGENT_HARNESS_V0_1`:

```text
node --test tests/*.test.mjs
node scripts/run-synthetic.mjs
node scripts/hash.mjs
```

## Current result

`HARNESS_AUDIT_REPAIR=PASS_LOCAL`: the full repair suite is 26/26 PASS, including real boundary/agent child-process IPC tests.

`LIVE_LLM_EXECUTION = UNVERIFIED`. No real model call ran. The live runner fails closed without an approved adapter and credential.

## Limits

This evidence does not establish LLM alignment, AGI capability, deployment safety, host/root-compromise resistance, OS-UID isolation, distributed-concurrency safety, or real-world side-effect safety.
