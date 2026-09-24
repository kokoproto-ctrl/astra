export const MAX_BODY=64*1024, MAX_AGENTS=5;
const id=/^[A-Za-z0-9_-]{1,64}$/;
const forbidden=new Set(['principal_id','task_id','request_id','policy_version','cost','budget','allowed_actions']);
const jobKeys=new Set(['jobId','clientLabel','goal','provider','model','confirmSyntheticOnly','agents']);
const agentKeys=new Set(['id','role','instructions']);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function validateJob(job){
  const errors=[]; if(!object(job)) return {ok:false,errors:['INVALID_JOB']};
  for(const k of Object.keys(job)){if(forbidden.has(k))errors.push('CLIENT_AUTHORITY_FORBIDDEN'); else if(!jobKeys.has(k))errors.push('UNKNOWN_FIELD');}
  if(!id.test(job.jobId||''))errors.push('JOB_ID_INVALID');
  if(typeof job.goal!=='string'||!job.goal.trim()||job.goal.length>6000)errors.push('GOAL_INVALID');
  if(job.clientLabel!==undefined&&(typeof job.clientLabel!=='string'||job.clientLabel.length>500))errors.push('CLIENT_LABEL_INVALID');
  if(job.provider!=='openai')errors.push('PROVIDER_INVALID'); if(job.model!=='gpt-5.6-luna')errors.push('MODEL_INVALID');
  if(job.confirmSyntheticOnly!==true)errors.push('SYNTHETIC_CONFIRMATION_REQUIRED');
  if(!Array.isArray(job.agents)||job.agents.length<1||job.agents.length>MAX_AGENTS)errors.push('AGENT_COUNT_INVALID');
  const seen=new Set(); for(const a of job.agents||[]){if(!object(a)){errors.push('AGENT_INVALID');continue;} for(const k of Object.keys(a))if(!agentKeys.has(k)||forbidden.has(k))errors.push('AGENT_FIELD_INVALID'); if(!id.test(a.id||'')||seen.has(a.id))errors.push('AGENT_ID_INVALID'); else seen.add(a.id); if(typeof a.role!=='string'||!a.role.trim()||a.role.length>500)errors.push('AGENT_ROLE_INVALID'); if(typeof a.instructions!=='string'||!a.instructions.trim()||a.instructions.length>2000)errors.push('AGENT_INSTRUCTIONS_INVALID');}
  return {ok:errors.length===0,errors:[...new Set(errors)]};
}
export async function readJson(request){if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw Object.assign(new Error('CONTENT_TYPE_REQUIRED'),{status:415}); const text=await request.text(); if(new TextEncoder().encode(text).byteLength>MAX_BODY)throw Object.assign(new Error('BODY_TOO_LARGE'),{status:413}); try{return JSON.parse(text);}catch{throw Object.assign(new Error('INVALID_JSON'),{status:400});}}
