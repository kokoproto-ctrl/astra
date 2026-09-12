export class EffectLedger {
  #effects = new Set();
  key(action) { return [action.task_id, action.principal_id, action.action, action.object_id, action.effect_id].join('|'); }
  has(action) { return this.#effects.has(this.key(action)); }
  record(action) { this.#effects.add(this.key(action)); }
}
