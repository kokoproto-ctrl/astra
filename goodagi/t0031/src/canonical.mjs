import { createHash } from 'node:crypto';

export const REQUIRED_ACTION_FIELDS = ['request_id','task_id','principal_id','action','object_id','payload','effect_id','policy_version','capability_id','capability_scope','action_class','nonce'];

function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw new TypeError('NON_FINITE_VALUE'); return JSON.stringify(value); }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  throw new TypeError('UNSUPPORTED_VALUE');
}

export function canonicalAction(action) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) throw new TypeError('MALFORMED_ACTION');
  for (const field of REQUIRED_ACTION_FIELDS) if (action[field] === undefined || action[field] === '') throw new TypeError(`MISSING_${field.toUpperCase()}`);
  return canonical({ request_id: action.request_id, task_id: action.task_id, principal_id: action.principal_id, action: action.action, object_id: action.object_id, payload: action.payload, effect_id: action.effect_id, policy_version: action.policy_version, capability_id: action.capability_id, capability_scope: action.capability_scope, action_class: action.action_class, nonce: action.nonce });
}

export function actionDigest(action) { return createHash('sha256').update(canonicalAction(action)).digest('hex'); }
