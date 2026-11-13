/**
 * The division invariant (owner, decision 0.3 and 12 November 2026): a ÷ is
 * never bare. Every Invert is a factor of a product, and never its first
 * factor: a real Number(1) leads instead (1÷b×a).
 *
 * `restoreLeadingOne(root)` puts a NEW 1 in front wherever that is broken:
 *   Multiply(Invert(b), a, c)   →  Multiply(1, Invert(b), a, c)   (÷b moved to the front)
 *   Multiply(Invert(b), a, 1)   →  Multiply(1, Invert(b), a, 1)   (the 1 moved to the end)
 *   Invert(b) on its own        →  Multiply(1, Invert(b))         (a product collapsed to ÷b)
 * It runs on every proposal (the transformation coordinator) and every commit
 * (the rule context), so no rule, present or future, can store a bare ÷, and
 * no rule needs code of its own for the leading 1.
 *
 * Pure: returns { root, changed }; the input is never modified.
 */
import { mapChildrenInPlace } from './nodeRegistry.js';
import { cloneExpression, createMultiply, createNumber } from './nodeFactory.js';

export function restoreLeadingOne(root) {
  if (!root) return { root, changed: false };
  let changed = false;
  const result = cloneExpression(root);

  // Returns the (possibly replaced) node. `inProduct` is true when the node
  // is a factor of a Multiply (the product itself puts a 1 in front of a
  // leading ÷, so a ÷ factor is never wrapped on its own).
  function visit(node, inProduct) {
    if (!node || typeof node !== 'object') return node;
    if (node.type === 'Multiply') {
      node.operands = node.operands.map(child => visit(child, true));
      if (node.operands[0]?.type === 'Invert') {
        node.operands.unshift(createNumber(1));
        changed = true;
      }
      return node;
    }
    if (node.type === 'Invert') {
      node.operand = visit(node.operand, false);
      if (inProduct) return node;
      // A ÷ outside a product (e.g. a product that collapsed to ÷b): 1÷b.
      changed = true;
      return createMultiply([createNumber(1), node], 'implicit');
    }
    // Any other node (a relation, Group, Negate, Apply …): visit its children.
    return mapChildrenInPlace(node, child => visit(child, false));
  }

  const restored = visit(result, false);
  return { root: changed ? restored : root, changed };
}

/** True when the tree has a bare ÷ (for tests and assertions). */
export function hasBareDivision(root) {
  return restoreLeadingOne(root).changed;
}
