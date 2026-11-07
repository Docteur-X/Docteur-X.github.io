/** DOM-independent intentions for negation expansion and compression. */
export function expandNegationAction(negateNodeId) {
  return typeof negateNodeId === 'string' ? Object.freeze({
    ruleId: 'negation.expand', parameters: Object.freeze({ negateNodeId })
  }) : null;
}
export function compressNegationAction(minusOneId, targetNodeId) {
  return typeof minusOneId === 'string' && typeof targetNodeId === 'string' ? Object.freeze({
    ruleId: 'negation.compress', parameters: Object.freeze({ minusOneId, targetNodeId })
  }) : null;
}
