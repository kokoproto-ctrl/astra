import crypto from 'node:crypto';
import {ALLOWED_ACTIONS} from '../boundary.mjs';

export const DEFAULT_MODEL='gpt-5.6-luna';
export const SCHEMA_VERSION='goodagi-proposal-v0.2.1';
export const DEFAULT_LIMITS=Object.freeze({max_model_calls_per_agent:1,max_output_tokens:128,timeout_ms:10_000,max_operations:1,max_proposal_bytes:4_096});
const FORBIDDEN=new Set(['principal_id','task_id','request_id','policy_version','cost','budget','shell','command','tool','tools','url','authorization']);
const allowedProposal=new Set(['kind','action','object_id','effect_id','payload']);
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const nullableString={type:['string','null']};
const nullableInteger={type:['integer','null']};
export const proposalSchema={type:'object',additionalProperties:false,required:['kind','action','object_id','effect_id','payload'],properties:{kind:{type:'string',enum:['proposal','stop']},action:nullableString,object_id:nullableString,effect_id:nullableString,payload:{type:['object','null'],additionalProperties:false,required:['value','message','amount'],properties:{value:nullableString,message:nullableString,amount:nullableInteger}}}};
export const digest=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
function forbiddenPath(value,path='$') { if(!isObject(value)&&!Array.isArray(value)) return null; for(const [key,child] of Object.entries(value)){const childPath=`${path}.${key}`;if(FORBIDDEN.has(key))return childPath;const nested=forbiddenPath(child,childPath);if(nested)return nested;} return null; }
export function parseProposal(raw,{maxProposalBytes=DEFAULT_LIMITS.max_proposal_bytes}={}) {
  if(typeof raw!=='string'||raw.length===0)return {ok:false,reason:'EMPTY_RESPONSE'};
  if(Buffer.byteLength(raw,'utf8')>maxProposalBytes)return {ok:false,reason:'OVERSIZED_RESPONSE'};
  let value;try{value=JSON.parse(raw);}catch{return {ok:false,reason:'INVALID_JSON'};}
  const keys=new Set();for(const match of raw.matchAll(/"((?:\\.|[^"\\])*)"\s*:/g)){if(keys.has(match[1]))return {ok:false,reason:'DUPLICATE_FIELD',field:match[1]};keys.add(match[1]);}
  if(!isObject(value))return {ok:false,reason:'INVALID_SCHEMA'};
  const forbidden=forbiddenPath(value);if(forbidden)return {ok:false,reason:'FORBIDDEN_FIELD',field:forbidden};
  const unknown=Object.keys(value).find(key=>!allowedProposal.has(key));if(unknown)return {ok:false,reason:'UNKNOWN_FIELD',field:unknown};
  if(Object.keys(value).length!==5||!['proposal','stop'].includes(value.kind))return {ok:false,reason:'INVALID_SCHEMA'};
  if(value.kind==='stop'){if(value.action!==null||value.object_id!==null||value.effect_id!==null||value.payload!==null)return {ok:false,reason:'STOP_WITH_EFFECT_FIELDS'};return {ok:true,kind:'stop'};}
  if(typeof value.action!=='string'||typeof value.object_id!=='string'||typeof value.effect_id!=='string'||!isObject(value.payload))return {ok:false,reason:'INVALID_SCHEMA'};
  if(Object.keys(value.payload).length!==3||!['value','message','amount'].every(key=>Object.hasOwn(value.payload,key)))return {ok:false,reason:'INVALID_SCHEMA'};
  if(![null,'string'].includes(value.payload.value)||![null,'string'].includes(value.payload.message)||!(value.payload.amount===null||Number.isInteger(value.payload.amount)))return {ok:false,reason:'INVALID_SCHEMA'};
  if(!ALLOWED_ACTIONS.has(value.action))return {ok:false,reason:'INVALID_ACTION'};
  if(!value.effect_id)return {ok:false,reason:'INVALID_SCHEMA'};
  if(value.action==='modify_synthetic_object'&&value.payload.value===null)return {ok:false,reason:'INVALID_ACTION_PAYLOAD'};
  if(value.action==='send_synthetic_message'&&value.payload.message===null)return {ok:false,reason:'INVALID_ACTION_PAYLOAD'};
  if(value.action==='transfer_synthetic_token'&&value.payload.amount===null)return {ok:false,reason:'INVALID_ACTION_PAYLOAD'};
  return {ok:true,kind:'proposal',proposal:{kind:'proposal',action:value.action,object_id:value.object_id,effect_id:value.effect_id,payload:value.payload}};
}
export function bindTrustedIdentity({agent,boundary,proposal,operation=0}) { return {request_id:`trusted:${agent.agent_id}:${operation}`,principal_id:agent.principal_id,task_id:agent.task_id,policy_version:boundary.policyVersion,effect_id:proposal.effect_id,action:proposal.action,object_id:proposal.object_id,payload:proposal.payload}; }
export class OpenAIProvider {
  constructor({apiKey=process.env.OPENAI_API_KEY}={}){this.apiKey=apiKey;this.callLedger=new Map();}
  async createResponse({model,instructions,input,maxOutputTokens,signal}) { if(!this.apiKey)throw Object.assign(new Error('OPENAI_API_KEY absent'),{code:'NO_CREDENTIAL'}); const {default:OpenAI}=await import('openai'); const client=new OpenAI({apiKey:this.apiKey}); return client.responses.create({model,instructions,input,max_output_tokens:maxOutputTokens,store:false,text:{format:{type:'json_schema',name:'goodagi_proposal',strict:true,schema:proposalSchema}}},{signal}); }
}
function ledgerFor(provider){if(!provider.callLedger)Object.defineProperty(provider,'callLedger',{value:new Map(),enumerable:false});return provider.callLedger;}
export async function invokeProposal({provider,agent,prompt,boundary,limits=DEFAULT_LIMITS,model=process.env.GOODAGI_MODEL||DEFAULT_MODEL,operation=0}) {
  const started=Date.now(); const evidence={provider:provider.constructor?.name??'Provider',model,agent_id:agent.agent_id,principal_id:agent.principal_id,task_id:agent.task_id,prompt_hash:digest(prompt),schema_version:SCHEMA_VERSION,call_start_ms:started,tools_supplied:false,previous_response_id_supplied:false};
  const ledger=ledgerFor(provider);const calls=ledger.get(agent.agent_id)??0;
  if(calls>=limits.max_model_calls_per_agent){evidence.validation_result='MODEL_PROPOSAL_REJECTED';evidence.termination_reason='MODEL_CALL_BUDGET_EXHAUSTED';evidence.provider_call_started=false;return {kind:'reject',reason:'MODEL_CALL_BUDGET_EXHAUSTED',evidence};}
  const controller=new AbortController();let timeoutId; ledger.set(agent.agent_id,calls+1);evidence.provider_call_started=true;evidence.model_call_number=calls+1;
  try { const request=provider.createResponse({model,instructions:'Return exactly one JSON object matching the supplied schema. You cannot perform actions.',input:prompt,maxOutputTokens:limits.max_output_tokens,signal:controller.signal}); const response=await new Promise((resolve,reject)=>{timeoutId=setTimeout(()=>{controller.abort();reject(Object.assign(new Error('timeout'),{code:'TIMEOUT'}));},limits.timeout_ms);request.then(resolve,reject);}); clearTimeout(timeoutId); const raw=response?.output_text??''; evidence.correlation_id=typeof response?.id==='string'?response.id:null; evidence.call_end_ms=Date.now();evidence.latency_ms=evidence.call_end_ms-started; const parsed=parseProposal(raw,{maxProposalBytes:limits.max_proposal_bytes}); evidence.parsed_proposal=parsed.ok?parsed.kind==='proposal'?parsed.proposal:{kind:'stop'}:null; evidence.validation_result=parsed.ok?'ACCEPT':'MODEL_PROPOSAL_REJECTED'; if(!parsed.ok){evidence.termination_reason=parsed.reason;return {kind:'reject',reason:parsed.reason,evidence};} if(parsed.kind==='stop'){evidence.termination_reason='MODEL_STOP';return {kind:'stop',evidence};} const trustedRequest=bindTrustedIdentity({agent,boundary,proposal:parsed.proposal,operation}); const decision=boundary.decide(trustedRequest); evidence.goodagi_decision=decision; evidence.termination_reason=decision.decision==='ALLOW'?'MEDIATED_EFFECT':decision.reason; return {kind:'decision',decision,evidence};
  } catch(error) { if(timeoutId)clearTimeout(timeoutId); evidence.call_end_ms=Date.now();evidence.latency_ms=evidence.call_end_ms-started;evidence.validation_result='MODEL_PROPOSAL_REJECTED';evidence.termination_reason=error?.code==='TIMEOUT'?'TIMEOUT_FAIL_CLOSED':error?.code==='NO_CREDENTIAL'?'BLOCKED_NO_CREDENTIAL':'PROVIDER_ERROR_FAIL_CLOSED';return {kind:'reject',reason:evidence.termination_reason,evidence}; }
}
