# Round 1 — Six-role expert draft

This is six deliberately separated analytical perspectives, not a claim that six independent models were run.

| Role | Findings and resulting requirement |
|---|---|
| AI / multi-agent architect | Delegation, direct-tool bypass, hidden channels, and collusion require task/principal/capability binding plus orchestrator-only envelopes. |
| AI safety / corrigibility | Goal drift, self-modifying policy, bypassed approvals, and inability to stop require deny-by-default, immutable policy, exact approval, and human shutdown. |
| Application security / DevSecOps | Prompt injection, credential misuse, confused deputy, and provider boundary attacks require independent broker validation, secret isolation, and controlled egress. |
| Reliability / distributed systems | Retry storms, stale decisions, replay, duplicate effects, crashes, and evidence corruption require hard limits, version checks, idempotency, committed recovery, and append-only evidence. |
| Human operator / human factors | Approval fatigue and misleading previews require a canonical exact-action digest and explicit approval invalidation. |
| Data / privacy / egress security | Prompt, task, and secret leakage require classification, input/output egress guards, and no cross-task context reuse. |

Initial finding disposition: all identified CRITICAL/HIGH risks received a T0031 enforcement owner and a negative contract case; no production implementation is claimed.
