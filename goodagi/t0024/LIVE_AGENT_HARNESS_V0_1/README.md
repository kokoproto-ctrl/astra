# LIVE_AGENT_HARNESS_V0_1

Bounded three-agent synthetic-tool harness for GOODAGI_001/T0024. Agents can only propose structured requests; `ControlBoundary` is the sole effect path. It has no external integrations.

Run `npm test`, `npm run run:synthetic`, then `npm run hash` with the bundled Node runtime. `npm run run:live` is fail-closed until an approved real-model adapter and credential are supplied; it never substitutes static text for a live model run.

Evidence is written to `evidence/`. The included synthetic runner is test evidence only, not LIVE_LLM evidence.
