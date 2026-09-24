# Deployment gate

This task does not authorize deployment, secrets, or real OpenAI calls. Before a separately authorized deployment, set `OPENAI_API_KEY` as a Wrangler secret and obtain an independent review of the real-provider path, account-level rate limiting, and Cloudflare account configuration.
