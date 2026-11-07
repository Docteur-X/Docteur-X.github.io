/**
 * Gesture adapters produce data, not calls into the mathematical engine.
 * Requests are deliberately DOM-free and may later originate from a menu,
 * keyboard shortcut, accessibility control, or another Mathematical Window.
 */
export function identityActionRequest(target) {
  const operation = target?.operation;
  if (operation !== 'Add' && operation !== 'Multiply') return null;
  if (typeof target.parentNodeId === 'string' && Number.isInteger(target.insertionIndex)) {
    return Object.freeze({ ruleId: 'identity.introduce', parameters: Object.freeze({
      operation, parentNodeId: target.parentNodeId, insertionIndex: target.insertionIndex
    }) });
  }
  if (typeof target.targetNodeId === 'string' && ['left', 'right'].includes(target.side)) {
    return Object.freeze({ ruleId: 'identity.introduce', parameters: Object.freeze({
      operation, targetNodeId: target.targetNodeId, side: target.side
    }) });
  }
  return null;
}
