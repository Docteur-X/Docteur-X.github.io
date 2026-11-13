/**
 * Syntactic categories are distinct from eventual value types (scalar/matrix).
 * Both are read from the node registry (nodeRegistry.js); this module keeps
 * the names older modules import.
 */
import { childrenOf, categoryOf, isExpressionNode } from './nodeRegistry.js';

export { categoryOf, isExpressionNode };

/** v1 assumes symbols denote scalars; type definitions (stage E3) will refine this. */
export function isScalarExpression(node) {
  return isExpressionNode(node) && childrenOf(node).every(isScalarExpression);
}
