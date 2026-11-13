/**
 * Historical test fixture adapter ONLY. Production parseExpression returns the
 * genuine mathematical root. Earlier rule tests were authored against the old
 * UI convention that enclosed each non-Add expression (and each equality side)
 * in a synthetic one-child Add. Keep those fixtures stable while new root
 * semantics receive their own direct production-parser tests.
 *
 * Never import this helper from application code. It is not a normalization
 * rule and must not leak into the semantic container map or history.
 */
import { parseExpression as parseNatural, expressionToInput, expressionToDisplayString } from '../../js/engine/parser.js';
import { createAdd } from '../../js/engine/nodeFactory.js';

function legacySide(root) {
  return root.type === 'Add' ? root : createAdd([root]);
}
export function parseExpression(input) {
  const root = parseNatural(input);
  if (root.type === 'Equal') {
    root.left = legacySide(root.left);
    root.right = legacySide(root.right);
    return root;
  }
  return legacySide(root);
}
export { expressionToInput, expressionToDisplayString };
