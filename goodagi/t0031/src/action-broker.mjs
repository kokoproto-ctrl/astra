export class ActionBroker {
  #kernel; #executor;
  constructor({ kernel, executor }) { this.#kernel = kernel; this.#executor = executor; }
  async propose(action, approval_token = null) {
    const receipt = this.#kernel.decide(action, approval_token);
    if (receipt.decision !== 'ALLOW') return receipt;
    try { const result = await this.#executor.execute(action); this.#kernel.commit(action); return { ...receipt, execution: result }; }
    catch { return { ...receipt, decision: 'STOP', reason: 'EXECUTOR_FAILURE_FAIL_CLOSED' }; }
  }
}
