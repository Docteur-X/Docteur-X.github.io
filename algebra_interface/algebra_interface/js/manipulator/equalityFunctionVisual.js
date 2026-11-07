/**
 * Equality application semantic visual descriptors (no DOM/CSS dependency).
 *
 * These functions describe *what* is new and which relation was targeted.
 * The mathematical renderer owns hitboxes and amber styling. The application
 * owns pointer/keyboard events and preview confirmation. This boundary lets
 * future windows render the same proposal without copying interaction code.
 */
export function describeEqualityApplicationPreview(candidate) {
  const result = candidate?.result;
  if (!result?.root || !result?.visualRoles) return null;
  return Object.freeze({
    kind: 'inserted-operands',
    insertedOperandIds: Object.freeze([...result.visualRoles.insertedOperandIds]),
    relationId: candidate.action.parameters.relationId
  });
}

export function describeEqualityApplicationFeedback(candidate) {
  if (!candidate?.result?.root) return null;
  return Object.freeze({ kind: 'eligible-relation-target',
    relationId: candidate.action.parameters.relationId });
}
