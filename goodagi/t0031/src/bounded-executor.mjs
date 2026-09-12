export class SyntheticReadOnlyExecutor {
  async execute(action) {
    if (action.action_class !== 'synthetic_read_only') throw new Error('EXECUTOR_CLASS_FORBIDDEN');
    return Object.freeze({ synthetic: true, action: action.action, object_id: action.object_id, external_side_effect: false });
  }
}
