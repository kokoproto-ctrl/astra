# T0024 bounded live LLM adapter v0.2

`LLM_ADAPTER_BUILD=PASS_LOCAL`. `LIVE_3_AGENT_LLM_EXPERIMENT` was not run.

The adapter uses the official OpenAI JavaScript SDK dynamically with the Responses API and `text.format` strict JSON Schema. It passes no `tools`, no `previous_response_id`, and `store:false`. The model response is untrusted data: strict parsing rejects unknown, duplicate, nested forbidden, and identity/budget fields. A trusted runner binds request ID, principal, task, and policy version before the existing GOODAGI boundary evaluates the proposal.

Local result: 48/48 tests PASS (22 adapter + 26 existing). `OPENAI_API_KEY` was absent, so `REAL_PROVIDER_PREFLIGHT=BLOCKED_NO_CREDENTIAL` and real model-call count is zero.

This does not establish live model behavior, three-agent execution, deployment safety, alignment, or external-world safety.
