import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { ActionBroker } from '../src/action-broker.mjs';
import { SyntheticReadOnlyExecutor } from '../src/bounded-executor.mjs';
import { EffectLedger } from '../src/effect-ledger.mjs';
import { EvidenceLedger } from '../src/evidence-ledger.mjs';
import { SafetyKernel } from '../src/safety-kernel.mjs';
import { actionDigest, canonicalAction } from '../src/canonical.mjs';

const base = () => ({ request_id: crypto.randomUUID(), task_id: 'task-1', principal_id: 'agent-1', action: 'read.status', object_id: 'synthetic://status/1', payload: { query: 'status', z: 1 }, effect_id: crypto.randomUUID(), policy_version: 'v0.1', capability_id: 'cap-read-1', capability_scope: 'read:status', action_class: 'synthetic_read_only', nonce: crypto.randomUUID(), requires_approval: false });
const setup = () => { const evidence = new EvidenceLedger(); const kernel = new SafetyKernel({ grants: [{ capability_id: 'cap-read-1', task_id: 'task-1', principal_id: 'agent-1', scope: 'read:status', actions: ['read.status'], object_prefix: 'synthetic://status/' }], effectLedger: new EffectLedger(), evidenceLedger: evidence }); return { kernel, evidence, broker: new ActionBroker({ kernel, executor: new SyntheticReadOnlyExecutor() }) }; };
const noAllow = async (mutate) => { const { broker } = setup(); const receipt = await broker.propose(mutate(base())); assert.notEqual(receipt.decision, 'ALLOW'); assert.ok(['DENY','STOP','REQUIRE_APPROVAL'].includes(receipt.decision)); assert.ok(receipt.reason); assert.equal(receipt.evidence_refs.length, 1); };

test('valid explicit synthetic capability produces audited ALLOW', async () => {
  const { broker, evidence } = setup(); const receipt = await broker.propose(base());
  assert.equal(receipt.decision, 'ALLOW'); assert.equal(receipt.execution.external_side_effect, false); assert.ok(receipt.reason); assert.ok(receipt.evidence_refs[0].event_hash); assert.equal(evidence.verify(), true);
});

test('canonicalization is deterministic and changes digest for every approval-relevant field', () => {
  const a = base(); const sameDifferentOrder = { ...a, payload: { z: 1, query: 'status' } };
  assert.equal(canonicalAction(a), canonicalAction(sameDifferentOrder)); assert.equal(actionDigest(a), actionDigest(sameDifferentOrder));
  for (const [key, value] of Object.entries({ payload: { query: 'other' }, object_id: 'synthetic://status/2', action: 'read.other', principal_id: 'agent-2', task_id: 'task-2', capability_id: 'other', policy_version: 'v0.2' })) assert.notEqual(actionDigest(a), actionDigest({ ...a, [key]: value }), key);
});

test('approval is exact, one-time, and invalidated by every bound field change', async () => {
  const fields = { payload: { query: 'changed' }, object_id: 'synthetic://status/2', action: 'read.other', task_id: 'task-2', principal_id: 'agent-2', capability_id: 'other', policy_version: 'v0.2' };
  for (const [field, value] of Object.entries(fields)) { const { kernel, broker } = setup(); const action = { ...base(), requires_approval: true }; const token = kernel.issueApproval(action); const receipt = await broker.propose({ ...action, [field]: value }, token); assert.notEqual(receipt.decision, 'ALLOW', field); }
  const { kernel, broker } = setup(); const action = { ...base(), requires_approval: true }; const token = kernel.issueApproval(action); assert.equal((await broker.propose(action, token)).decision, 'ALLOW'); assert.equal((await broker.propose({ ...action, effect_id: crypto.randomUUID() }, token)).decision, 'REQUIRE_APPROVAL');
});

test('identity, task, capability, policy, malformed input, and deferred guard all fail closed', async () => {
  await noAllow((a) => ({ ...a, principal_id: 'agent-2' })); await noAllow((a) => ({ ...a, task_id: 'task-2' })); await noAllow((a) => ({ ...a, capability_id: 'missing' })); await noAllow((a) => ({ ...a, action: 'write.status' })); await noAllow((a) => ({ ...a, policy_version: 'v0.0' })); await noAllow((a) => ({ ...a, action_class: 'external_effect' }));
  const { broker } = setup(); const malformed = await broker.propose({ request_id: 'only' }); assert.equal(malformed.decision, 'DENY'); assert.ok(malformed.evidence_refs[0].event_hash);
});

test('effect ledger blocks retry and replay without second execution', async () => {
  const { broker } = setup(); const action = base(); assert.equal((await broker.propose(action)).decision, 'ALLOW'); const replay = await broker.propose(action); assert.equal(replay.decision, 'DENY'); assert.equal(replay.reason, 'DUPLICATE_OR_REPLAY_EFFECT');
});

test('shutdown wins before decision and after approval', async () => {
  { const { kernel, broker } = setup(); kernel.shutdown(); assert.equal((await broker.propose(base())).decision, 'STOP'); }
  { const { kernel, broker } = setup(); const action = { ...base(), requires_approval: true }; const token = kernel.issueApproval(action); kernel.shutdown(); assert.equal((await broker.propose(action, token)).decision, 'STOP'); }
});

test('evidence chain detects tampering', async () => {
  const { broker, evidence } = setup(); await broker.propose(base()); await broker.propose(base()); assert.equal(evidence.verify(), true); const forged = evidence.events(); forged[0].receipt.reason = 'FORGED'; assert.equal(evidence.verify(forged), false);
});

const matrix = JSON.parse(await readFile(new URL('../../t0030/negative-test-matrix.v0.1.json', import.meta.url), 'utf8'));
const mutators = {
  'THR-001': a => ({ ...a, capability_id: 'none' }), 'THR-002': a => ({ ...a, action_class: 'external_effect' }), 'THR-003': a => ({ ...a, principal_id: 'attacker' }), 'THR-004': a => ({ ...a, capability_scope: 'admin' }), 'THR-005': a => ({ ...a, action_class: 'external_effect' }), 'THR-006': a => ({ ...a, requires_approval: true }), 'THR-007': a => ({ ...a, requires_approval: true, approval_token: 'forged' }), 'THR-008': a => ({ ...a, requires_approval: true, payload: { changed: true } }), 'THR-009': a => ({ ...a, action_class: 'external_effect', payload: { secret: 'SECRET' } }), 'THR-010': a => ({ ...a, action_class: 'external_effect' }), 'THR-011': a => ({ ...a, action_class: 'external_effect' }), 'THR-012': a => ({ ...a, action: 'agent.hidden_message' }), 'THR-013': a => ({ ...a, task_id: 'other-task' }), 'THR-014': a => ({ ...a, task_id: 'other-task' }), 'THR-015': a => ({ ...a, task_id: 'other-task' }), 'THR-016': a => ({ ...a, action: 'write.status' }), 'THR-017': a => ({ ...a, action_class: 'external_effect' }), 'THR-018': a => ({ ...a, action_class: 'external_effect' }), 'THR-019': a => ({ ...a, action_class: 'external_effect' }), 'THR-020': a => ({ ...a, policy_version: 'v0.0' }), 'THR-021': a => ({ ...a, effect_id: 'recorded-effect' }), 'THR-022': a => ({ ...a, effect_id: 'recorded-effect' }), 'THR-023': a => ({ ...a, principal_id: 'forged' }), 'THR-024': a => ({ ...a, action: 'evidence.delete' }), 'THR-025': a => ({ ...a, action_class: 'external_effect' }), 'THR-026': a => ({ ...a, action_class: 'external_effect' }), 'THR-027': a => ({ ...a, policy_version: 'v0.0' }), 'THR-028': a => ({ ...a, principal_id: '' }), 'THR-029': a => ({ ...a, principal_id: 'deputy' }), 'THR-030': a => ({ ...a, capability_scope: 'broader' }), 'THR-031': a => ({ ...a, action_class: 'external_effect' }), 'THR-032': a => ({ ...a, action: 'recovery.promote' }), 'THR-033': a => ({ ...a, requires_approval: true, payload: { ui: 'different' } })
};
for (const entry of matrix.tests) test(`T0030 ${entry.TEST_ID} ${entry.THREAT_ID} cannot authorize`, async () => {
  const { broker, kernel } = setup(); const action = base(); const candidate = mutators[entry.THREAT_ID](action);
  if (['THR-021','THR-022'].includes(entry.THREAT_ID)) { candidate.effect_id = 'recorded-effect'; await broker.propose(candidate); const replay = await broker.propose(candidate); assert.notEqual(replay.decision, 'ALLOW'); return; }
  const token = entry.THREAT_ID === 'THR-008' || entry.THREAT_ID === 'THR-033' ? kernel.issueApproval({ ...action, requires_approval: true }) : null;
  const receipt = await broker.propose(candidate, token); assert.notEqual(receipt.decision, 'ALLOW'); assert.ok(receipt.evidence_refs.length === 1);
});
