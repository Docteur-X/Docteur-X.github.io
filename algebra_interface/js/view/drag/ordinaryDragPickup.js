/**
 * Resolve an ordinary operand pickup through the current view-local semantic
 * index. CSS determines which visible draggable affordance the user selected;
 * it never supplies mathematical identity. The caller remains responsible for
 * eligibility, AST parent checks, pointer capture, and drag presentation.
 *
 * Requiring the resolved occurrence to match the selected hitbox prevents a
 * stale/mislabelled inner target from silently promoting pickup to its parent.
 */
export function resolveOrdinaryDragPickup({ hitbox, resolver, mathematicalObjectId }) {
  if (!hitbox || !resolver || !mathematicalObjectId) return null;
  const address = resolver.addressFromElement(hitbox, { mathematicalObjectId });
  if (!address || address.role !== 'occurrence' ||
      address.mathematicalObjectId !== mathematicalObjectId ||
      address.nodeId !== hitbox.dataset?.nodeId) return null;
  const resolved = resolver.resolve({
    mathematicalObjectId, nodeId: address.nodeId, targetRole: 'occurrence'
  });
  if (resolved.outcome !== 'found' || !resolved.elements.includes(hitbox)) return null;
  return Object.freeze({ mathematicalObjectId, nodeId: address.nodeId, role: 'occurrence' });
}
