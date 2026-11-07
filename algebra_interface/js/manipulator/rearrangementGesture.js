/**
 * Translate an insertion-slot gesture into a DOM-independent action request.
 * Indices refer to the operand array AFTER removing the dragged operand;
 * this is the same convention used by the Engine's reorderChild rule.
 * Neither pointer geometry nor commutativity belongs in this adapter.
 */
export function rearrangementActionRequest({ parentId, parentType, draggedNodeId, destinationIndex } = {}) {
  if (!['Add', 'Multiply'].includes(parentType) ||
      typeof parentId !== 'string' || !parentId ||
      typeof draggedNodeId !== 'string' || !draggedNodeId ||
      !Number.isInteger(destinationIndex) || destinationIndex < 0) return null;
  return Object.freeze({
    ruleId: parentType === 'Add' ? 'addition.rearrange' : 'multiplication.rearrange',
    parameters: Object.freeze({ parentId, parentType, draggedNodeId, destinationIndex })
  });
}
