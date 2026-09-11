# Security boundary

Requests are size-limited to 64 KiB and strictly validate job/agent keys. Client authority fields are denied. The Worker generates request, principal, task, policy, budget, and allowed-action values. Only synthetic `send_synthetic_message` is admitted by the policy boundary. There is no CORS override, no persistent evidence storage, and no real provider call while the flag remains false.
