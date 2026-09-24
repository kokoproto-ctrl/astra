import test from 'node:test'; import assert from 'node:assert/strict'; import {ControlBoundary} from '../src/boundary.mjs';
function b(){return new ControlBoundary({principals:[{id:'a',task_id:'ta',budget:2,allowed_actions:['inspect_object']},{id:'b',task_id:'tb',budget:2,allowed_actions:['inspect_object']}],objects:[{id:'o',value:0,version:1}]});} function r(x={}){return {request_id:'r',principal_id:'a',task_id:'ta',effect_id:'e',action:'inspect_object',object_id:'o',policy_version:1,...x};}
test('principal and task binding fail closed',()=>assert.equal(b().decide(r({principal_id:'b'})).reason,'ACTOR_OR_TASK_BINDING_FAILED'));
test('budget is charged once and valid replay is free',()=>{const x=b(),a=x.decide(r()),z=x.decide(r({request_id:'again'}));assert.equal(a.decision,'ALLOW');assert.equal(z.decision,'REPLAY');assert.equal(x.principals.get('a').remaining,1)});
test('scope changed replay is denied',()=>assert.equal((()=>{const x=b();x.decide(r());return x.decide(r({request_id:'x',object_id:'missing'}));})().reason,'SCOPED_EFFECT_SCOPE_MISMATCH'));
test('reserved namespace denied',()=>assert.equal(b().decide(r({effect_id:'ipc:x'})).reason,'RESERVED_EFFECT_ID_PREFIX'));
test('stale policy denied',()=>assert.equal(b().decide(r({policy_version:0})).reason,'STALE_POLICY'));
test('malformed denied',()=>assert.equal(b().decide({}).reason,'MALFORMED_REQUEST'));
test('unauthorized action denied',()=>assert.equal(b().decide(r({action:'host_shell'})).reason,'UNAUTHORIZED_ACTION'));
test('budget exhaustion denied',()=>{const x=b();x.decide(r());x.decide(r({request_id:'2',effect_id:'2'}));assert.equal(x.decide(r({request_id:'3',effect_id:'3'})).reason,'BUDGET_EXHAUSTED')});
