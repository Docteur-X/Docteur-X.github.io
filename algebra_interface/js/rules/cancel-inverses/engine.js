/**
 * Cancel a factor with its inverse in a product (pure Engine code), division
 * stage D3:
 *
 *   a · b ÷ b   with b and ÷b   →   a · 1,   assuming b ≠ 0
 *
 * x · (1/x) = 1 holds only when x ≠ 0, so the result carries that assumption;
 * the commit keeps it with the history step (owner, 12 November 2026: shown in
 * history and on the status line, no extra confirmation). The pair is replaced
 * by one 1, in the place of the first of the two; removing the 1 is numeric
 * combination's existing step. A product left with one factor becomes it.
 *
 * Scope: symbolic pairs. A pair numeric combination can already multiply
 * (numbers, or symbols with assigned values) is left to it.
 * The multiplicative twin of ../cancel-opposites (t + −t = 0).
 */
import { createNumber, cloneExpression } from '../../engine/nodeFactory.js';
import { findNodeById } from '../../engine/treeUtils.js';
import { normaliseWithRules } from '../../engine/normalization.js';
import { structurallyEqual } from '../../engine/structuralEquality.js';
import { canCombineFactors } from '../../engine/operations/multiplication.js';
import { expressionToDisplayString } from '../../engine/parser.js';

/** The divisor x when one factor is x and the other ÷x (brackets and notation ignored), else null. */
export function inverseDivisor(first, second) {
  if (second?.type === 'Invert' && structurallyEqual(second.operand, first)) return second.operand;
  if (first?.type === 'Invert' && structurallyEqual(first.operand, second)) return first.operand;
  return null;
}

/** The product holding both factors directly, or null. */
function commonProduct(root, firstId, secondId) {
  let product = null;
  const visit = node => {
    if (product || !node || typeof node !== 'object') return;
    if (node.type === 'Multiply' && node.operands.some(o => o.id === firstId) &&
        node.operands.some(o => o.id === secondId)) { product = node; return; }
    for (const child of [...(node.operands ?? []), node.operand, node.left, node.right]) visit(child);
  };
  visit(root);
  return product;
}

export function cancelInverses(root, sourceId, targetId, substitutions = {}) {
  if (!root || sourceId === targetId) return null;
  const product = commonProduct(root, sourceId, targetId);
  if (!product) return null;
  const source = product.operands.find(o => o.id === sourceId);
  const target = product.operands.find(o => o.id === targetId);
  const divisor = inverseDivisor(source, target);
  if (!divisor) return null;
  // Numeric combination already multiplies these (e.g. 2 · ÷2); leave them to it.
  if (canCombineFactors(target, source, substitutions)) return null;

  const result = cloneExpression(root);
  const resultProduct = findNodeById(result, product.id);
  const firstIndex = Math.min(...[sourceId, targetId].map(id => resultProduct.operands.findIndex(o => o.id === id)));
  const one = createNumber('1');
  resultProduct.operands = resultProduct.operands
    .map((operand, index) => (index === firstIndex ? one : operand))
    .filter(operand => operand.id !== sourceId && operand.id !== targetId);
  const text = `${expressionToDisplayString(divisor)} ≠ 0`;
  return {
    root: normaliseWithRules(result),
    oneId: one.id,
    affectedNodeIds: [sourceId, targetId],
    // The condition the step relies on; the commit stores it with the step.
    assumptions: [{ kind: 'nonzero', text, expression: cloneExpression(divisor) }],
    provenance: { rule: 'multiplication.cancel-inverses', ruleVersion: 1, productId: product.id, sourceId, targetId }
  };
}
