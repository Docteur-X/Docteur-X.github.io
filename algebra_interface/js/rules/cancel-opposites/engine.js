/**
 * Cancel a term with its opposite in a sum (pure Engine code).
 *
 *   a + b + −b   with b and −b   →   a + 0
 *
 * The additive inverse law: t + (−t) = 0. The pair is replaced by one 0, at
 * the place of the first of the two, so the step stays visible; removing the
 * 0 is numeric combination's existing step (drag the 0 onto another term).
 * A sum left with one term becomes that term (b + −b → 0).
 *
 * Scope: symbolic pairs. Two terms that numeric combination can already add
 * (numbers, or symbols with assigned values) are left to it, so the two rules
 * never claim the same drop.
 *
 * Two terms are opposites when one is the negation of the other, compared by
 * structure (node IDs ignored): b and −b, 2x and −(2x), (a+b) and −(a+b).
 * No DOM, no state: inputs are never changed.
 */
import { createNumber, cloneExpression } from '../../engine/nodeFactory.js';
import { findNodeById } from '../../engine/treeUtils.js';
import { normaliseWithRules } from '../../engine/normalization.js';
import { canCombineAddends } from '../../engine/operations/addition.js';

/**
 * The structure of a node for comparison: without its IDs, and without
 * notation that does not change the value (how a product is written, the
 * bracket style), so 2x and 2·x are the same term.
 */
const NOTATION_ONLY = new Set(['id', 'displayStyle', 'bracketStyle']);
function shape(node) {
  return JSON.stringify(node, (key, value) => (NOTATION_ONLY.has(key) ? undefined : value));
}

// Explicit brackets are notation, not value: (2x) and 2x are the same term,
// so one Group layer is looked through on each side (−(2x) and 2x cancel).
const unwrap = node => (node?.type === 'Group' ? node.operand : node);
const sameTerm = (first, second) => shape(unwrap(first)) === shape(unwrap(second));

export function areOpposites(first, second) {
  if (!first || !second) return false;
  return (second.type === 'Negate' && sameTerm(second.operand, first)) ||
    (first.type === 'Negate' && sameTerm(first.operand, second));
}

/** The sum that holds both terms as direct operands, or null. */
function commonSum(root, firstId, secondId) {
  const first = findNodeById(root, firstId);
  if (!first) return null;
  let sum = null;
  const visit = node => {
    if (sum || !node || typeof node !== 'object') return;
    if (node.type === 'Add' && node.operands.some(o => o.id === firstId) &&
        node.operands.some(o => o.id === secondId)) { sum = node; return; }
    for (const child of [...(node.operands ?? []), node.operand, node.left, node.right]) visit(child);
  };
  visit(root);
  return sum;
}

export function cancelOpposites(root, sourceId, targetId, substitutions = {}) {
  if (!root || sourceId === targetId) return null;
  const sum = commonSum(root, sourceId, targetId);
  if (!sum) return null;
  const source = sum.operands.find(o => o.id === sourceId);
  const target = sum.operands.find(o => o.id === targetId);
  if (!areOpposites(source, target)) return null;
  // Numeric combination already adds these (e.g. 3 + −3); leave them to it.
  if (canCombineAddends(target, source, substitutions)) return null;

  const result = cloneExpression(root);
  const resultSum = findNodeById(result, sum.id);
  const firstIndex = Math.min(...[sourceId, targetId].map(id => resultSum.operands.findIndex(o => o.id === id)));
  const zero = createNumber('0');
  resultSum.operands = resultSum.operands
    .map((operand, index) => (index === firstIndex ? zero : operand))
    .filter(operand => operand.id !== sourceId && operand.id !== targetId);
  // A sum with one term left becomes that term (normalisation does this).
  return {
    root: normaliseWithRules(result),
    zeroId: zero.id,
    affectedNodeIds: [sourceId, targetId],
    provenance: { rule: 'addition.cancel-opposites', ruleVersion: 1, sumId: sum.id, sourceId, targetId }
  };
}
