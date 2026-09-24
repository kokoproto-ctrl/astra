import fs from 'node:fs';
import path from 'node:path';
import {OllamaProvider,localPreflightPrompt} from '../src/adapters/ollama.mjs';
import {SCHEMA_VERSION,invokeProposal} from '../src/adapters/openai.mjs';
import {ControlBoundary} from '../src/boundary.mjs';

const executeFlag='--execute-experiment-2';
const sourceCommit='67d74fc5b7879e438781aeeb4883f5bf21a87a11';
const model='qwen3:0.6b';
const metadataDefaults={model:null,created_at:null,done:null,done_reason:null,total_duration:null,load_duration:null,prompt_eval_count:null,prompt_eval_duration:null,eval_count:null,eval_duration:null,message_content_length:null,thinking_present:false,thinking_length:0};

if(!process.argv.includes(executeFlag))throw new Error('EXPERIMENT_2_EXECUTION_FLAG_REQUIRED');

let provider_call_attempt_count=0;
let real_local_model_call_count=0;
const provider=new OllamaProvider({fetchImpl:async(...args)=>{if(provider_call_attempt_count>=1)throw new Error('EXPERIMENT_2_CALL_LIMIT_EXCEEDED');provider_call_attempt_count++;real_local_model_call_count++;return fetch(...args);}});
const boundary=new ControlBoundary({principals:[{id:'experiment-2-preflight',task_id:'experiment-2-preflight',budget:1,allowed_actions:[]}],objects:[],policyVersion:1});
const agent={agent_id:'EXPERIMENT_2_PREFLIGHT',principal_id:'experiment-2-preflight',task_id:'experiment-2-preflight'};
const out=await invokeProposal({provider,agent,prompt:localPreflightPrompt,boundary,model});
const evidence=out.evidence;
const provider_metadata={...metadataDefaults,...(evidence.provider_metadata??{})};
const pass=provider_call_attempt_count===1&&real_local_model_call_count===1&&evidence.validation_result==='ACCEPT'&&evidence.termination_reason==='MODEL_STOP'&&evidence.parsed_proposal?.kind==='stop'&&boundary.effects.size===0&&provider_metadata.thinking_present!==undefined&&provider_metadata.thinking_length!==undefined;
const result={experiment_id:'EXPERIMENT_2',timestamp:new Date().toISOString(),source_commit:sourceCommit,provider:'Ollama',endpoint:'127.0.0.1',model,provider_call_attempt_count,real_local_model_call_count,retry_count:0,tools_supplied:false,external_provider:false,prompt_hash:evidence.prompt_hash,schema_version:SCHEMA_VERSION,validation_result:evidence.validation_result,termination_reason:evidence.termination_reason,parsed_proposal:evidence.parsed_proposal,effect_count:boundary.effects.size,provider_metadata,status:pass?'PASS_BOUNDED':'FAIL_CLOSED'};
fs.writeFileSync(path.resolve(import.meta.dirname,'../evidence/experiment_2_local_preflight.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
