# GOODAGI T0024 — LIVE_AGENT_HARNESS_V0_1

This commit records the bounded synthetic-agent harness and local evidence for `GOODAGI_001/T0024`.

## Architecture

Each independent agent context can only emit a structured request proposal. The request passes through `ControlBoundary`, which performs default-deny policy checks, principal/task/action/object binding, budget checks, policy-version validation, idempotency/replay validation, and the only synthetic effect commit. Agents receive no host shell, filesystem, network, or real-service tools.

## Run

Use the bundled Node runtime, then from `LIVE_AGENT_HARNESS_V0_1`:

```text
node --test tests/*.test.mjs
node scripts/run-synthetic.mjs
node scripts/hash.mjs
```

## Current result

`PASS_LOCAL`: local suite is 10/10 PASS; the bounded three-agent synthetic fixture produced six mediated decisions.

`LIVE_LLM_EXECUTION = UNVERIFIED`. No real model call ran. The live runner fails closed without an approved adapter and credential.

## Limits

This evidence does not establish LLM alignment, AGI capability, deployment safety, host/root-compromise resistance, OS-UID isolation, distributed-concurrency safety, or real-world side-effect safety.
