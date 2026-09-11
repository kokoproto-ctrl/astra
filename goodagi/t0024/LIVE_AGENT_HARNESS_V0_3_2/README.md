# LIVE_AGENT_HARNESS_V0_1_1

Bounded three-agent synthetic-tool harness for GOODAGI_001/T0024. Agents can only propose structured requests; `ControlBoundary` is the sole effect path. It has no external integrations. Action costs are server-side policy constants: agent-provided `cost` is rejected fail-closed.

Run `npm test`, `npm run audit:repair`, `npm run run:synthetic`, then `npm run hash` with the bundled Node runtime. The audit suite includes real boundary and agent child processes communicating over loopback IPC; agents never receive a boundary/state reference. `npm run run:live` is fail-closed until an approved real-model adapter and credential are supplied; it never substitutes static text for a live model run.

Evidence is written to `evidence/`. The included synthetic runner is test evidence only, not LIVE_LLM evidence.
