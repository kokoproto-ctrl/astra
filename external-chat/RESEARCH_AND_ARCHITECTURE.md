# ASTRA External — research and architecture v0.1

Date: 2026-09-26
Status: IMPLEMENTED CANDIDATE / E2E USER QUALIFICATION PENDING

## Research question

Can ASTRA expose a real interactive chat UI outside ChatGPT without paid OpenAI API usage, while preserving the existing free-stack direction and keeping the current ASTRA execution system intact?

## Findings

### 1. The current ChatGPT-hosted ASTRA cannot be treated as a public HTTP chat backend

The ChatGPT project/window is not an externally addressable runtime. A React app cannot attach to the current chat session as if it were an API endpoint. Therefore a real external UI needs its own runtime.

Decision: build ASTRA External as an independent runtime and keep the current ChatGPT/Work ASTRA as a separate client/executor until a qualified bridge exists.

### 2. Free interactive model layer is feasible

Primary provider selected for v0.1: Groq Free with `openai/gpt-oss-120b`.

Reasons:
- free tier exists with account-level rate limits;
- OpenAI-compatible chat API;
- tool use;
- built-in browser search and code interpreter on supported GPT-OSS models;
- supports local function/tool calling so ASTRA can route controlled effects through its own boundary.

Primary references:
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/responses-api
- https://console.groq.com/docs/tool-use/local-tool-calling
- https://console.groq.com/docs/tool-use/built-in-tools
- https://console.groq.com/docs/model/openai/gpt-oss-120b

Cloudflare Workers AI was investigated as a fallback because a free daily allocation and function calling are available, but it is not the primary v0.1 provider because the current ASTRA stack has no connected Cloudflare control plane.

### 3. React can be hosted without a second paid compute service

Render Static Sites are suitable for React/Vite output and do not require running another always-on web service.

References:
- https://render.com/docs/static-sites
- https://render.com/docs/free

Decision: React UI is a Render Static Site. The existing Render Python service remains an execution worker.

### 4. Supabase can provide the control plane for the external chat

Existing ASTRA Supabase project can provide:
- Auth;
- Postgres state;
- RLS;
- Vault for per-user provider credentials;
- Edge Functions;
- Realtime later if streaming/status fanout is added.

References:
- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/vault
- https://supabase.com/docs/guides/functions
- https://supabase.com/docs/guides/realtime

## Implemented architecture

```
User
  |
  v
React/Vite UI — Render Static Site
  |
  | Supabase user JWT
  v
Supabase Edge Function: astra-external-chat
  |
  +--> Supabase Postgres: sessions/messages/events
  |
  +--> Supabase Vault: encrypted per-user Groq key
  |
  +--> Groq Free / gpt-oss-120b
  |      + browser_search
  |      + code_interpreter
  |      + local tool call: render_compute
  |
  +--> ASTRA Render Executor v1.4
         ^
         |
   one-time payload-bound ticket
         |
   Supabase capability RPC
```

## Render capability design

ASTRA External does not know or reuse the existing production executor token.

For each external Render operation:
1. Edge runtime validates model arguments against an allowlist.
2. It creates a random ticket ID and fence token.
3. It canonicalizes and hashes the exact payload.
4. It stores a ticket with a 90-second expiry.
5. Render receives ticket ID, fence token, effect ID, generation, action and payload.
6. Render independently canonicalizes/hashes the payload.
7. Render calls a boolean-only Supabase RPC.
8. RPC atomically marks the matching ticket consumed.
9. Only then can Render execute the allowlisted operation.

Properties:
- fail closed;
- one-time use;
- short-lived;
- payload bound;
- replay resistant;
- no shared production executor secret;
- no client read/list/create access to tickets.

The Supabase linter intentionally reports the capability-claim RPC as an anonymous SECURITY DEFINER endpoint. This is accepted for v0.1 because anonymous callers cannot enumerate/create tickets and successful use requires possession of all high-entropy ticket capability fields. The endpoint returns only boolean.

## Allowed external Render operations v0.1

- NUMERIC_STATS
- TEXT_ANALYZE
- FIBONACCI

Arbitrary shell/code execution is deliberately NOT exposed to the model.

## Existing ASTRA / Work bridge

The current Supabase/n8n bridge contains multiple wake functions, but the verified wake surfaces available during this implementation are predominantly under TEST_ONLY schemas/wrappers. No production-qualified endpoint was found that can safely be treated as “send this arbitrary external chat task to current ChatGPT Work ASTRA”.

Decision: do not fake this integration. ASTRA External v0.1 remains independent. A production delegation bridge is a separate qualification task.

## Current implementation state

LIVE:
- Render Static Site UI
- Supabase Auth-backed frontend
- Supabase chat/session/event schema
- RLS
- Vault provider credential storage
- Edge chat runtime v2
- Groq provider integration code
- Groq browser/code tools
- local model tool loop (bounded to four iterations)
- Render Executor v1.4
- one-time external execution tickets

PENDING REAL USER E2E QUALIFICATION:
- create/login user;
- add a real Groq Free key;
- verify chat response;
- force/observe a render_compute tool call;
- confirm execution receipt/event;
- configure Supabase Auth production Site URL / Redirect URL if confirmation redirect is not already allowed.

NOT YET IMPLEMENTED:
- canonical Google Drive memory in the external runtime;
- production-qualified delegation to the existing Gmail/Work loop;
- full parity with current ChatGPT project instructions/tools;
- response token streaming to the UI;
- dependency lockfile and CI regression suite.

## Definition of “full ASTRA outside ChatGPT”

Do not call ASTRA External a full replacement until:
- canonical memory read/write semantics are implemented;
- all required tool contracts are available under a default-deny boundary;
- external-to-Work delegation is either production-qualified or no longer required;
- identity/authorization/readback/receipts are verified end to end;
- failure/retry/idempotency behavior is tested;
- model-provider fallback policy is defined;
- user E2E test passes without manual backend intervention.

