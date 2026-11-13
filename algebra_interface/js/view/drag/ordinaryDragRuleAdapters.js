/**
 * Live mathematical rule adapters for ordinary-drop arbitration.
 *
 * The drag target is a semantic hint, never permission to mutate the AST.
 * Each adapter re-reads the current root when called. In particular, the
 * insertion boundary is resolved from the CURRENT tree, not a cached hover
 * rectangle. The existing preview/commit paths must validate again.
 *
 * Dependencies are explicitly injected to keep this module independent of
 * DOM, application state, preview rendering and history. The eligibility
 * dispatcher catches exceptions and fails closed.
 */
// `validateRuleTarget(kind, { drag, target })` asks the rule bundle that
// contributed that drop-target kind (stage 4). This module names no rule.
export function createOrdinaryDragRuleAdapters({
  drag, target, getRoot, validateRuleTarget
}) {
  if (!drag || !target || typeof getRoot !== 'function') {
    throw new TypeError('A drag, target and live root reader are required');
  }
  return {
    ruleTarget: kind => typeof validateRuleTarget === 'function' &&
      validateRuleTarget(kind, { drag, target }) === true
  };
}
