import fs from 'node:fs'; import path from 'node:path'; import {hash} from './boundary.mjs';
export function writeJsonl(file, rows) { fs.writeFileSync(file, rows.map(x=>JSON.stringify(x)).join('\n') + (rows.length?'\n':'')); }
export function manifest({agents, model, promptText}) { return {format:'GOODAGI_LIVE_AGENT_HARNESS_V0_1', model, started_at:new Date(0).toISOString(), agents:agents.map(a=>({agent_id:a.agent_id,principal_id:a.principal_id,task_id:a.task_id,prompt_hash:hash(promptText),max_operations:a.max_operations,context_limit:a.context_limit})), deterministic_stop:'max_operations_or_terminal_decision'}; }
export async function runThreeAgents({boundary, agents, invoke, evidenceDir, model='UNSPECIFIED', promptText=''}) {
  const events=[]; const decisions=[]; const effects=[]; const budget=[];
  for (const agent of agents) {
    for (let turn=0; turn<agent.max_operations; turn++) {
      const proposal = await invoke(agent, turn);
      if (!proposal) { events.push({agent_id:agent.agent_id,termination_reason:'MODEL_STOP'}); break; }
      const request={...proposal, request_id:`${agent.agent_id}-${turn}`, principal_id:agent.principal_id, task_id:agent.task_id, policy_version:boundary.policyVersion};
      const result=boundary.decide(request); events.push({agent_id:agent.agent_id,turn,request,result}); decisions.push(result); if(result.decision==='ALLOW') effects.push(result); budget.push({agent_id:agent.agent_id,before:result.budget_before,after:result.budget_after});
      if(result.decision==='DENY' && result.reason==='BUDGET_EXHAUSTED') { events.push({agent_id:agent.agent_id,termination_reason:'BUDGET_EXHAUSTED'}); break; }
    }
  }
  fs.mkdirSync(evidenceDir,{recursive:true}); fs.writeFileSync(path.join(evidenceDir,'run_manifest.json'),JSON.stringify(manifest({agents,model,promptText}),null,2)); writeJsonl(path.join(evidenceDir,'agent_events.jsonl'),events); writeJsonl(path.join(evidenceDir,'policy_decisions.jsonl'),decisions); writeJsonl(path.join(evidenceDir,'effects.jsonl'),effects); writeJsonl(path.join(evidenceDir,'budget_events.jsonl'),budget);
  return {events,decisions,effects,budget};
}
