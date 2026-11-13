/**
 * Pure classification of an ordinary drag's final action.
 *
 * This module deliberately knows nothing about DOM, history, rules, previews,
 * or the application store. Eligibility is checked by the caller BEFORE this
 * function is invoked; this only determines which already-validated exit to
 * execute. Keeping this tiny decision pure makes the side-effectful exit
 * branches in app.js easier to audit and test.
 *
 * A click (no movement) is different from a drop. A cancelled release never
 * activates a rule, even when its last hover target looked eligible.
 */
// `ruleTargetKinds` lists the drop-target kinds that rule bundles contribute
// (stage 4, e.g. 'negation-compress'). Such a release exits through that
// rule's own drop handler, so this module needs no rule-specific case.
export function classifyOrdinaryDragCompletion({ commit, moved, targetKind, hasDistributionPlan, ruleTargetKinds = [] }) {
  if (!commit) return 'cancel';
  if (!moved) return 'select';
  if (ruleTargetKinds.includes(targetKind)) return targetKind;
  switch (targetKind) {
    case 'distribution': return hasDistributionPlan ? 'distribution' : 'cancel';
    case 'combine': return 'combine';
    case 'insert': return 'insert';
    default: return 'cancel';
  }
}
