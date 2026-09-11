import test from 'node:test'; import assert from 'node:assert/strict'; import {ControlBoundary} from '../lib/boundary.mjs';
const boundary=()=>new ControlBoundary({principals:[{id:'p',task_id:'t',budget:1,allowed_actions:['send_synthetic_message']}],objects:[{id:'operator-channel',value:'x',version:1}]});
const request={request_id:'r',principal_id:'p',task_id:'t',policy_version:1,effect_id:'same',action:'send_synthetic_message',object_id:'operator-channel',payload:{message:'safe'}};
test('valid synthetic proposal allows and is principal-scoped',()=>{const b=boundary();assert.equal(b.decide(request).decision,'ALLOW');assert.equal(b.decide(request).decision,'REPLAY')});
test('unauthorized action and agent-controlled cost deny',()=>{const b=boundary();assert.equal(b.decide({...request,action:'shell'}).decision,'DENY');assert.equal(b.decide({...request,cost:0}).reason,'AGENT_CONTROLLED_COST')});
