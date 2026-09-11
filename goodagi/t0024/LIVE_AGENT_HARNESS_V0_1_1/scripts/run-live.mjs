import process from 'node:process';
if (!process.env.OPENAI_API_KEY) { console.error('LIVE_LLM_BLOCKED: OPENAI_API_KEY is absent. No model request was made.'); process.exitCode=2; } else { console.error('LIVE_LLM_NOT_IMPLEMENTED: configure an approved model adapter that returns schema-validated proposals only.'); process.exitCode=2; }
