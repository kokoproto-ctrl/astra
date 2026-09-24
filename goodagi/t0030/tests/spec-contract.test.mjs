import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const load = async (name) => JSON.parse(await readFile(new URL(name, root), 'utf8'));
const threatModel = await load('threat-model.v0.1.json');
const invariantModel = await load('safety-invariants.v0.1.json');
const matrix = await load('negative-test-matrix.v0.1.json');
const requiredThreat = ['THREAT_ID','TITLE','DESCRIPTION','ASSET','TRUST_BOUNDARY','PRECONDITION','ATTACK_PATH','IMPACT','LIKELIHOOD','SEVERITY','MITIGATION','DETECTION','RELATED_INVARIANTS','RELATED_TESTS','RESIDUAL_RISK','OWNER_TASK'];
const requiredInvariant = ['INVARIANT_ID','STATEMENT','RATIONALE','SEVERITY','ENFORCEMENT_LAYER','FAILURE_BEHAVIOR','RELATED_THREATS','TEST_IDS'];
const requiredTest = ['TEST_ID','THREAT_ID','INVARIANT_ID','PRECONDITION','INPUT','EXPECTED_DECISION','EXPECTED_REASON','EXPECTED_EVIDENCE','SIDE_EFFECT_ALLOWED','SEVERITY'];
const ids = (items, field) => new Set(items.map((item) => item[field]));
const threats = threatModel.threats;
const invariants = invariantModel.invariants;
const tests = matrix.tests;
const threatIds = ids(threats, 'THREAT_ID');
const invariantIds = ids(invariants, 'INVARIANT_ID');
const testIds = ids(tests, 'TEST_ID');

test('JSON documents and mandatory fields are valid', () => {
  assert.equal(threatModel.schema_version, '1.0');
  assert.equal(invariantModel.schema_version, '1.0');
  assert.equal(matrix.schema_version, '1.0');
  for (const t of threats) for (const key of requiredThreat) assert.ok(t[key] !== undefined && t[key] !== '');
  for (const i of invariants) for (const key of requiredInvariant) assert.ok(i[key] !== undefined && i[key] !== '');
  for (const t of tests) for (const key of requiredTest) assert.ok(t[key] !== undefined && t[key] !== '');
});

test('IDs, severities, and failure semantics are constrained', () => {
  assert.equal(threatIds.size, threats.length); assert.equal(invariantIds.size, invariants.length); assert.equal(testIds.size, tests.length);
  for (const t of threats) assert.ok(['CRITICAL','HIGH','MEDIUM','LOW'].includes(t.SEVERITY));
  for (const i of invariants) { assert.ok(['CRITICAL','HIGH','MEDIUM','LOW'].includes(i.SEVERITY)); assert.ok(['DENY','STOP','REQUIRE_APPROVAL'].includes(i.FAILURE_BEHAVIOR)); }
  for (const t of tests) assert.ok(['DENY','STOP','REQUIRE_APPROVAL'].includes(t.EXPECTED_DECISION));
});

test('traceability is bidirectional and has no orphan critical/high threats', () => {
  for (const threat of threats) {
    assert.ok(threat.RELATED_INVARIANTS.length && threat.RELATED_TESTS.length, `${threat.THREAT_ID} is orphaned`);
    for (const id of threat.RELATED_INVARIANTS) assert.ok(invariantIds.has(id));
    for (const id of threat.RELATED_TESTS) assert.ok(testIds.has(id));
    if (['CRITICAL','HIGH'].includes(threat.SEVERITY)) { assert.ok(threat.MITIGATION); assert.ok(threat.RELATED_TESTS.length); }
  }
  for (const matrixTest of tests) {
    assert.ok(threatIds.has(matrixTest.THREAT_ID)); assert.ok(invariantIds.has(matrixTest.INVARIANT_ID));
    assert.ok(threats.find((t) => t.THREAT_ID === matrixTest.THREAT_ID).RELATED_TESTS.includes(matrixTest.TEST_ID));
    assert.ok(invariants.find((i) => i.INVARIANT_ID === matrixTest.INVARIANT_ID).TEST_IDS.includes(matrixTest.TEST_ID));
  }
  for (const invariant of invariants) for (const threatId of invariant.RELATED_THREATS) assert.ok(threatIds.has(threatId));
});

test('every critical invariant has executable matrix coverage and no invariant is orphaned', () => {
  for (const invariant of invariants) {
    assert.ok(invariant.TEST_IDS.length, `${invariant.INVARIANT_ID} has no tests`);
    for (const id of invariant.TEST_IDS) assert.ok(testIds.has(id));
    if (invariant.SEVERITY === 'CRITICAL') assert.ok(invariant.TEST_IDS.some((id) => testIds.has(id)));
  }
});

test('dangerous outcomes fail closed and never permit side effects', () => {
  for (const matrixTest of tests) {
    assert.notEqual(matrixTest.EXPECTED_DECISION, 'ALLOW');
    assert.equal(matrixTest.SIDE_EFFECT_ALLOWED, false);
  }
});

test('exact-action approval records and checks action digests', () => {
  const approvalTests = tests.filter((t) => t.INVARIANT_ID === 'INV-007' || t.INVARIANT_ID === 'INV-008');
  assert.ok(approvalTests.some((t) => /digest/i.test(`${t.INPUT} ${t.EXPECTED_REASON} ${t.EXPECTED_EVIDENCE}`)));
  for (const t of approvalTests) assert.ok(['DENY','REQUIRE_APPROVAL'].includes(t.EXPECTED_DECISION));
});

test('reference policy decisions fail closed', () => {
  const decide = ({ capability, validationError, effectful, approvedDigest, actionDigest }) => {
    if (validationError || !capability) return 'DENY';
    if (effectful && approvedDigest !== actionDigest) return 'REQUIRE_APPROVAL';
    return effectful ? 'REQUIRE_APPROVAL' : 'DENY'; // T0030 never specifies implicit allow.
  };
  assert.equal(decide({ capability: false }), 'DENY');
  assert.equal(decide({ capability: true, validationError: true }), 'DENY');
  assert.equal(decide({ capability: true, effectful: true, approvedDigest: 'a', actionDigest: 'b' }), 'REQUIRE_APPROVAL');
  assert.equal(decide({ capability: true, effectful: true, approvedDigest: 'a', actionDigest: 'a' }), 'REQUIRE_APPROVAL');
});

test('T0030 declares specification coverage, not production enforcement', () => {
  assert.equal(threatModel.production_enforcement_status, 'NOT_IMPLEMENTED_T0031_REQUIRED');
  assert.equal(invariantModel.status, 'SPECIFICATION_ONLY');
});
