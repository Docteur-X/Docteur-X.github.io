import { isRelationNode, meaningFieldsOf, nodeTypeInfo } from '../engine/nodeRegistry.js';
import { sequenceOf } from '../definitions/operators/presentation.js';
/**
 * Read the labelled part an element belongs to (standard 4).
 *
 * The renderer labels every occurrence and operator:
 *   <div data-hitbox-role="occurrence" data-node-id="node-1" data-parent-id="node-3">
 *   <span data-hitbox-role="operator" data-operator-owner-id="node-5">−</span>
 * This turns the nearest such element into plain data, looking up the node
 * types in the TREE (never in CSS classes), so gesture declarations can be
 * matched against it.
 *
 *   { role: 'occurrence', nodeId, nodeType, value?, parentType?, sideTerm?, selected }
 *
 * `sideTerm` is true for a whole side of an equation, or a term of a sum that
 * is a side (read from the side's own box, R1 `.equation-side`). Rules that
 * act across = (e.g. both-sides) declare on it.
 *   { role: 'operator', ownerId, ownerType, operatorIndex? }
 *
 * `findNode(id)` returns the tree node with that ID (or null).
 * `isSelected(id)` says whether the occurrence is in the current selection.
 * Returns null when the element is not inside a labelled part.
 */
export function partFromElement(element, { findNode, isSelected = () => false }) {
  const labelled = element?.closest?.('[data-hitbox-role="occurrence"][data-node-id], [data-hitbox-role="operator"][data-operator-owner-id]');
  if (!labelled) return null;
  const data = labelled.dataset;
  if (data.hitboxRole === 'operator') {
    const owner = findNode(data.operatorOwnerId);
    if (!owner) return null;
    return Object.freeze({
      role: 'operator', ownerId: owner.id, ownerType: owner.type,
      ...(data.operatorIndex !== undefined ? { operatorIndex: Number(data.operatorIndex) } : {})
    });
  }
  const node = findNode(data.nodeId);
  if (!node) return null;
  const parent = data.parentId ? findNode(data.parentId) : null;
  // The parent sum's own box says what IT sits in (its data-parent-id).
  // A term of a SUM that is itself a whole side (both-sides adds its opposite).
  const parentBox = sequenceOf(parent)?.role === 'sum' ? labelled.parentElement?.closest?.('[data-hitbox-role="occurrence"][data-node-id]') : null;
  // A side of a relation (=, later <, ≤ …), or a term of a sum that is one.
  const sideTerm = isRelationNode(parent) ||
    Boolean(parentBox && parent && parentBox.dataset?.nodeId === parent.id &&
      isRelationNode(findNode(parentBox.dataset.parentId)));
  return Object.freeze({
    role: 'occurrence', nodeId: node.id, nodeType: node.type,
    // A node whose meaning includes a value (a Number) shows it to patterns: value '-1'.
    ...(Object.hasOwn(meaningFieldsOf(nodeTypeInfo(node)), 'value') ? { value: String(node.value) } : {}),
    ...(parent ? { parentType: parent.type } : {}),
    ...(sideTerm ? { sideTerm: true } : {}),
    selected: Boolean(isSelected(node.id))
  });
}
