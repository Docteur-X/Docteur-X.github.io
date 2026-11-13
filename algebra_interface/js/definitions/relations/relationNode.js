/**
 * Build a relation node (stage E4c): two scalar sides, `left` and `right`,
 * stored under the relation's own node type (Equal, Less, Greater). Used by
 * relation definitions in their notation rows.
 */
import { createNodeId } from '../../engine/nodeFactory.js';
import { isScalarExpression } from '../../engine/nodeCategories.js';

export const relationNodeBuilder = (type, word) => (left, right) => {
  if (!isScalarExpression(left) || !isScalarExpression(right)) {
    throw new TypeError(`${word} v1 requires two scalar expressions.`);
  }
  return { id: createNodeId(), type, left, right };
};
