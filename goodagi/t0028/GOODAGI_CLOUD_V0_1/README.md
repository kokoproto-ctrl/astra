# GOODAGI Cloud v0.1

One Cloudflare Worker serves the preserved R35 static UI and same-origin `/api/health`, `/api/validate`, and `/api/run`. Runtime authority is generated server-side and mediated by `ControlBoundary`; the browser cannot supply it. `GOODAGI_REAL_PROVIDER_ENABLED` is `false` by default, so `/api/run` returns `REAL_PROVIDER_DISABLED` and performs zero OpenAI calls.

`OPENAI_API_KEY` is intentionally absent from source and config. A separately authorized future deployment would add it with `wrangler secret put OPENAI_API_KEY`; no secret operation or deployment is part of this build.

Run `npm run dev`, `npm test`, or `npm run cf:dry-run`. Dry-run validates packaging only, not deployment readiness.
