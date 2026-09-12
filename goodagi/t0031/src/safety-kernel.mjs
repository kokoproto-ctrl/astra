import { actionDigest } from './canonical.mjs';

const decision = (kind, reason) => ({ decision: kind, reason });
export class SafetyKernel {
  #grants; #approvals = new Map(); #effects; #evidence; #shutdown = false;
  constructor({ grants, effectLedger, evidenceLedger, policyVersion = 'v0.1' }) { this.#grants = new Map(grants.map((g) => [g.capability_id, Object.freeze({ ...g })])); this.#effects = effectLedger; this.#evidence = evidenceLedger; this.policyVersion = policyVersion; }
  shutdown() { this.#shutdown = true; }
  issueApproval(action) { const digest = actionDigest(action); const token = `approval:${this.#approvals.size + 1}`; this.#approvals.set(token, Object.freeze({ action_digest: digest, task_id: action.task_id, principal_id: action.principal_id, capability_id: action.capability_id, policy_version: action.policy_version, used: false })); return token; }
  decide(action, approval_token) {
    let digest = null;
    try { digest = actionDigest(action); } catch (error) { return this.#receipt(action, digest, decision('DENY', error.message)); }
    if (this.#shutdown) return this.#receipt(action, digest, decision('STOP', 'HUMAN_SHUTDOWN'));
    if (action.policy_version !== this.policyVersion) return this.#receipt(action, digest, decision('DENY', 'STALE_OR_UNKNOWN_POLICY'));
    if (action.action.startsWith('policy.') || action.action.startsWith('invariant.')) return this.#receipt(action, digest, decision('DENY', 'POLICY_SELF_MODIFICATION_FORBIDDEN'));
    if (action.action_class !== 'synthetic_read_only') return this.#receipt(action, digest, decision('DENY', 'GUARD_REQUIRED'));
    const grant = this.#grants.get(action.capability_id);
    if (!grant) return this.#receipt(action, digest, decision('DENY', 'MISSING_OR_INVALID_CAPABILITY'));
    if (grant.task_id !== action.task_id || grant.principal_id !== action.principal_id) return this.#receipt(action, digest, decision('DENY', 'TASK_OR_PRINCIPAL_BINDING_MISMATCH'));
    if (grant.scope !== action.capability_scope || !grant.actions.includes(action.action) || !action.object_id.startsWith(grant.object_prefix)) return this.#receipt(action, digest, decision('DENY', 'CAPABILITY_SCOPE_MISMATCH'));
    if (this.#effects.has(action)) return this.#receipt(action, digest, decision('DENY', 'DUPLICATE_OR_REPLAY_EFFECT'));
    if (action.requires_approval) {
      const approval = this.#approvals.get(approval_token);
      if (!approval) return this.#receipt(action, digest, decision('REQUIRE_APPROVAL', 'APPROVAL_REQUIRED'));
      if (approval.used || approval.action_digest !== digest || approval.task_id !== action.task_id || approval.principal_id !== action.principal_id || approval.capability_id !== action.capability_id || approval.policy_version !== action.policy_version) return this.#receipt(action, digest, decision('REQUIRE_APPROVAL', 'APPROVAL_BINDING_MISMATCH'));
      this.#approvals.set(approval_token, { ...approval, used: true });
    }
    return this.#receipt(action, digest, decision('ALLOW', 'EXPLICIT_CAPABILITY_VALIDATED'));
  }
  commit(action) { this.#effects.record(action); }
  #receipt(action, digest, result) {
    const receipt = { receipt_id: `receipt:${crypto.randomUUID()}`, request_id: action?.request_id ?? null, principal_id: action?.principal_id ?? null, task_id: action?.task_id ?? null, action: action?.action ?? null, action_digest: digest, policy_version: action?.policy_version ?? null, capability_id: action?.capability_id ?? null, ...result };
    const evidence = this.#evidence.append(receipt);
    return { ...receipt, evidence_refs: [evidence] };
  }
}
