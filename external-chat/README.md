# ASTRA External v0.1

Independent web chat runtime for ASTRA that does not depend on the ChatGPT UI.

## Architecture

User -> React Static Site (Render) -> Supabase Auth -> Supabase Edge Function -> Groq Free (openai/gpt-oss-120b)

State:
- Supabase Postgres: sessions, messages, events
- Supabase Vault: per-user Groq API key
- RLS: users can read only their own chat/session/event rows

Tools:
- Groq browser_search
- Groq code_interpreter
- ASTRA Render Executor via one-time, payload-bound execution tickets

The Render executor remains default-deny. ASTRA External never receives the existing production executor token.
For EXTERNAL mode the Edge Function creates a 90-second ticket in Supabase containing a payload hash and fence token.
The Render executor validates and atomically consumes that ticket through a boolean-only RPC before running an allowlisted operation.

External Render operations in v0.1:
- NUMERIC_STATS
- TEXT_ANALYZE
- FIBONACCI

## Free-stack intent

- React Static Site: Render free static hosting
- Runtime/state/auth/vault: existing Supabase project, free quota
- Interactive model: user-owned Groq Free API key
- Compute executor: existing Render free web service

No paid OpenAI API is required.

## Isolation

This runtime is isolated from the current ChatGPT-hosted ASTRA runtime.
It does not mutate or replace the existing Gmail/Work wake loop.
The current bridge exposes multiple TEST_ONLY wake paths, so delegation to Work is deliberately not enabled in v0.1.

## Current public UI

https://astra-external-ui-v1.onrender.com

## Remaining qualification before calling it a replacement for current ASTRA

1. End-to-end login + Groq-key test from a real user account.
2. End-to-end Render tool call through a real external session.
3. Configure Supabase Auth Site URL / redirect allow-list for the Render domain if email confirmation requires it.
4. Add a qualified production delegation contract for Gmail/Work.
5. Add canonical Drive memory/OAuth if the external runtime is to share the same canonical knowledge base.
6. Add dependency lockfile and automated regression tests.
