import { identityActionRequest } from './actionRequests.js';

/** Resolve a toolbar drag against the *committed* DOM, never preview DOM.
 * DOM is only inspected here; the engine receives an ID-based action request.
 * The operator path is intentionally checked before enclosing operand boxes.
 */
export function interpretIdentityPointer(container, element, x, operation) {
  if (!element || !container?.contains(element)) return null;
  const operator = element.closest?.('.plus[data-operator-index], .multiply-operator[data-operator-index]');
  const className = operation === 'Add' ? 'plus' : 'multiply-operator';
  if (operator?.classList.contains(className)) {
    const action = identityActionRequest({ operation,
      parentNodeId: operator.dataset.operatorParentId,
      insertionIndex: Number(operator.dataset.operatorIndex) });
    return action ? { action, element: operator } : null;
  }
  const hitbox = element.closest?.('.add-operand[data-node-id], .factor-slot[data-node-id]');
  if (!hitbox || !container.contains(hitbox)) return null;
  const rect = hitbox.getBoundingClientRect();
  const action = identityActionRequest({ operation, targetNodeId: hitbox.dataset.nodeId,
    side: x < rect.left + rect.width / 2 ? 'left' : 'right' });
  return action ? { action, element: hitbox } : null;
}
