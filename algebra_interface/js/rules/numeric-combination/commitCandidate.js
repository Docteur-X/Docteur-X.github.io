/**
 * Prepare a numeric sibling-combination on a detached mathematical tree.
 *
 * Pointer hit-testing only identifies the intended source and target. This
 * adapter revalidates their shared parent and asks the existing pure algebra
 * operations to perform the rewrite. No live AST, history or DOM is touched.
 * A rejected request is null, not a partially changed mathematical object.
 *
 * In particular, the moving occurrence must be removed BEFORE the rule is
 * invoked (the rule replaces the target). For 0 times a factor, the rule may
 * collapse the entire product; do not reinsert unrelated factors afterwards.
 */
import { findNodeById } from '../../engine/treeUtils.js';
import { expressionToDisplayString } from '../../engine/parser.js';
import { normaliseWithRules } from '../../engine/normalization.js';
import { combineNumericAddends } from '../../engine/operations/addition.js';
import { combineNumericFactors } from '../../engine/operations/multiplication.js';

export function prepareNumericCombinationCommitCandidate(root, {
  parentId, movingNodeId, targetNodeId, substitutions = {}
} = {}) {
  if (!root || !parentId || !movingNodeId || !targetNodeId ||
      movingNodeId === targetNodeId) return null;
  const detached = structuredClone(root);
  const parent = findNodeById(detached, parentId);
  if (!parent || !['Add', 'Multiply'].includes(parent.type) || !Array.isArray(parent.operands)) return null;
  const movingIndex = parent.operands.findIndex(node => node.id === movingNodeId);
  const target = parent.operands.find(node => node.id === targetNodeId);
  if (movingIndex < 0 || !target) return null;
  const moving = parent.operands[movingIndex];
  const movingText = expressionToDisplayString(moving);
  const targetText = expressionToDisplayString(target);
  // Both rules are allowed to mutate the detached parent, never the source.
  parent.operands.splice(movingIndex, 1);
  const result = parent.type === 'Add'
    ? combineNumericAddends(parent, targetNodeId, moving, substitutions)
    : combineNumericFactors(parent, targetNodeId, moving, substitutions);
  if (!result) return null;
  const resultRoot = normaliseWithRules(detached);
  // 0·a÷b = 0 relies on b ≠ 0 (division stage D3): kept with the history step.
  const assumptions = (result.divisorsAssumedNonzero ?? []).map(divisor =>
    ({ kind: 'nonzero', text: `${expressionToDisplayString(divisor)} ≠ 0` }));
  const label = `${parent.type === 'Add' ? 'Added' : 'Multiplied'} ${movingText} and ${targetText} to make ${expressionToDisplayString(result.result)}`;
  return {
    action: { ruleId: parent.type === 'Add' ? 'addition.combine-numeric' : 'multiplication.combine-numeric',
      parameters: { parentId, movingNodeId, targetNodeId } },
    result: { root: resultRoot, resultNodeId: result.result.id, kind: result.kind, assumptions },
    actionLabel: label,
    resultText: expressionToDisplayString(result.result)
  };
}
