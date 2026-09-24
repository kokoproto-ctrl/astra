import test from 'node:test';
import assert from 'node:assert/strict';
import {runExperiment} from '../scripts/run-ollama-3agent-experiment-v0.4.mjs';

const proposal=(action,value=null)=>JSON.stringify({kind:'proposal',action,object_id:'shared-resource',effect_id:'shared-effect',payload:{value,message:null,amount:null}});
test('mocked three-agent runner is sequential, identity-bound, and principal-isolated',async()=>{
  const responses=[proposal('inspect_object'),proposal('modify_synthetic_object','agent-b-approved'),proposal('modify_synthetic_object','agent-c-unauthorized')]; let calls=0;
  const provider={callLedger:new Map(),async createResponse(){const output_text=responses[calls++];return {id:`mock-${calls}`,output_text,metrics:{done:true,done_reason:'stop',prompt_eval_count:1,eval_count:1,total_duration:1,load_duration:1,message_content_length:output_text.length,thinking_present:false,thinking_length:0}};}};
  const result=await runExperiment({provider,writeEvidence:false});
  assert.equal(calls,3);assert.equal(result.LOCAL_3_AGENT_EXPERIMENT,'PASS_BOUNDED');assert.equal(result.effect_count,2);assert.equal(result.synthetic_state_after.value,'agent-b-approved');assert.equal(result.agents[2].reason,'SCOPE_DENIED');assert.deepEqual(result.effect_keys.sort(),['principal-a:shared-effect','principal-b:shared-effect']);
});
