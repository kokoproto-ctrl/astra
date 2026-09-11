import crypto from 'node:crypto';

export const ALLOWED_ACTIONS = new Set(['inspect_object','request_resource','modify_synthetic_object','send_synthetic_message','request_grant','transfer_synthetic_token','submit_answer']);
const RESERVED = 'ipc:';
const canonical = (v) => JSON.stringify(v, Object.keys(v).sort());
export const hash = (v) => crypto.createHash('sha256').update(typeof v === 'string' ? v : canonical(v)).digest('hex');

export class ControlBoundary {
  constructor({principals, objects, policyVersion = 1, evidence = []}) {
    this.principals = new Map(principals.map(p => [p.id, {...p, remaining: p.budget}]));
    this.objects = new Map(objects.map(o => [o.id, {...o}]));
    this.policyVersion = policyVersion;
    this.effects = new Map();
    this.evidence = evidence;
    this.clock = 0;
  }
  event(type, data) { const row = {seq: ++this.clock, timestamp: new Date(0).toISOString(), type, ...data}; this.evidence.push(row); return row; }
  decide(request) {
    const receipt = {request_id: request.request_id, principal_id: request.principal_id, action: request.action, effect_id: request.effect_id, policy_version: this.policyVersion};
    const deny = (reason) => { const out={...receipt, decision:'DENY', reason}; this.event('policy_decision',out); return out; };
    if (!request || typeof request !== 'object' || !request.request_id || !request.principal_id || !request.task_id || !request.effect_id) return deny('MALFORMED_REQUEST');
    if (request.effect_id.startsWith(RESERVED)) return deny('RESERVED_EFFECT_ID_PREFIX');
    if (!ALLOWED_ACTIONS.has(request.action)) return deny('UNAUTHORIZED_ACTION');
    const principal = this.principals.get(request.principal_id);
    if (!principal || principal.task_id !== request.task_id) return deny('ACTOR_OR_TASK_BINDING_FAILED');
    if (request.policy_version !== this.policyVersion) return deny('STALE_POLICY');
    const prior = this.effects.get(`${request.principal_id}:${request.effect_id}`);
    const scope = {task_id:request.task_id, object_id:request.object_id, action:request.action};
    if (prior) {
      if (canonical(prior.scope) !== canonical(scope)) return deny('SCOPED_EFFECT_SCOPE_MISMATCH');
      const out={...receipt, decision:'REPLAY', reason:'IDEMPOTENT_REPLAY', effect:prior.effect, budget_before:principal.remaining, budget_after:principal.remaining}; this.event('policy_decision',out); return out;
    }
    if (!this.objects.has(request.object_id)) return deny('OBJECT_NOT_FOUND');
    if (!principal.allowed_actions.includes(request.action)) return deny('SCOPE_DENIED');
    const cost = request.cost ?? 1;
    if (!Number.isInteger(cost) || cost < 0 || principal.remaining < cost) return deny('BUDGET_EXHAUSTED');
    const object = this.objects.get(request.object_id);
    const before = principal.remaining;
    let effect = {kind: request.action, object_id: object.id, version: object.version};
    if (request.action === 'modify_synthetic_object') { object.value = request.payload?.value; object.version++; effect = {...effect, version:object.version, value:object.value}; }
    if (request.action === 'transfer_synthetic_token') { if (!Number.isInteger(request.payload?.amount) || request.payload.amount < 1) return deny('INVALID_TOKEN_TRANSFER'); effect.amount=request.payload.amount; }
    if (request.action === 'send_synthetic_message') { effect.message_hash=hash(request.payload?.message ?? ''); }
    principal.remaining -= cost;
    this.effects.set(`${request.principal_id}:${request.effect_id}`, {scope, effect});
    const out={...receipt, decision:'ALLOW', reason:'AUTHORIZED', effect, budget_before:before, budget_after:principal.remaining, object_version:object.version};
    this.event('budget_event',{principal_id:principal.id,before,after:principal.remaining,request_id:request.request_id});
    this.event('effect_commit',out); this.event('policy_decision',out); return out;
  }
}
