/**
 * Pure rearrangement eligibility and a prospective order for visual feedback.
 * The Engine's operation-specific commutativity rules are authoritative.
 * No AST is mutated here: pointer movement can call this safely many times.
 */
import { findNodeById } from '../../engine/treeUtils.js';
import { canReorderAddend, reorderAddend } from '../../engine/operations/addition.js';
import { canReorderFactor, reorderFactor } from '../../engine/operations/multiplication.js';

export function proposeRearrangement(root, parameters = {}) {
  const { parentId, parentType, draggedNodeId, destinationIndex } = parameters;
  const parent = findNodeById(root, parentId);
  if (!parent || parent.type !== parentType || !Array.isArray(parent.operands)) return null;
  const permitted = parentType === 'Add'
    ? canReorderAddend(parent, draggedNodeId, destinationIndex)
    : parentType === 'Multiply'
      ? canReorderFactor(parent, draggedNodeId, destinationIndex) : false;
  if (!permitted) return null;
  const original = parent.operands.map(child => child.id);
  const remaining = original.filter(id => id !== draggedNodeId);
  remaining.splice(destinationIndex, 0, draggedNodeId);
  return Object.freeze({
    parentId, parentType, draggedNodeId, destinationIndex,
    visualOrder: Object.freeze(remaining),
    changed: remaining.some((id, index) => id !== original[index])
  });
}

/** Commit through the same Engine operation as before; revalidate live state. */
export function applyRearrangement(root, parameters = {}) {
  if (!proposeRearrangement(root, parameters)) return false;
  const parent = findNodeById(root, parameters.parentId);
  return parent.type === 'Add'
    ? reorderAddend(parent, parameters.draggedNodeId, parameters.destinationIndex)
    : reorderFactor(parent, parameters.draggedNodeId, parameters.destinationIndex);
}
