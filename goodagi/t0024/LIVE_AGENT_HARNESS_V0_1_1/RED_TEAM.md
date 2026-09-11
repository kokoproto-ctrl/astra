# Red-team review

Executed attacks are regression-tested in `tests/`:

- actor/task rebinding: denied;
- reserved synthetic/internal effect namespace: denied;
- stale policy version: denied;
- unauthorized action and malformed requests: denied;
- budget exhaustion: denied;
- scope-changed replay: denied;
- eight concurrent duplicate retries: one commit and seven replays;
- three principals using one client-visible effect ID: isolated commits.

No external effect path exists in this artifact: there are no network, shell, filesystem, messaging, payment, or real-service adapters exposed to agents. A real LLM adapter is deliberately absent, so a live experiment is blocked rather than simulated.

Not verified: a hostile host/root, OS UID separation on Windows, real model behavior, provider tool isolation, prompt-injection resistance of a particular model, and distributed race behavior.
