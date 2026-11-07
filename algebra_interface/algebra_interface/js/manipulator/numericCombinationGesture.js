/** DOM-free numeric-combination intention and semantic feedback. */
export function numericCombinationActionRequest({ operation, parentId, movingNodeId, targetNodeId }) {
  if (!['Add','Multiply'].includes(operation) || !parentId || !movingNodeId || !targetNodeId) return null;
  return Object.freeze({ ruleId: operation === 'Add' ? 'addition.combine-numeric' : 'multiplication.combine-numeric',
    parameters: Object.freeze({parentId, movingNodeId, targetNodeId}) });
}
export function describeNumericCombinationFeedback(candidate) {
  if (!candidate?.result?.root) return null;
  return Object.freeze({kind:'numeric-combination', targetNodeId:candidate.action.parameters.targetNodeId});
}
