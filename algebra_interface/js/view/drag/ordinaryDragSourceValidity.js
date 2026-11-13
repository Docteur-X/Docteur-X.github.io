import { isRelationNode } from '../../engine/nodeRegistry.js';
/**
 * Authoritative pre-arbitration source check for an ordinary drag.
 *
 * Hover feedback is never evidence that a drop is still mathematically valid.
 * This pure predicate compares the source's document/object/revision/root and
 * fingerprint with the current committed expression, then checks that the
 * dragged operand still occupies its original associative-parent slot.
 *
 * The semantic drag-session freshness gate is separate: it additionally checks
 * pointer identity, view and render generation before this predicate is used.
 */
export function isOrdinaryDragSourceCurrent({ drag, currentStamp, root, findNodeById }) {
  if (!drag || !currentStamp || typeof findNodeById !== 'function' ||
      typeof drag.item?.id !== 'string' || !drag.arbitrationSourceStamp) return false;
  const original = drag.arbitrationSourceStamp;
  if (!['documentId', 'objectId', 'revision', 'rootId', 'fingerprint']
    .every((key) => original[key] === currentStamp[key])) return false;
  if (typeof drag.parentId !== 'string') return false;
  const parent = findNodeById(root, drag.parentId);
  // A whole side of a relation sits in a named slot ('left' or 'right'),
  // not a numbered one; it must still be in that same slot.
  if (drag.startIndex === 'left' || drag.startIndex === 'right') {
    return isRelationNode(parent) && parent[drag.startIndex]?.id === drag.item.id;
  }
  if (!Number.isInteger(drag.startIndex) || drag.startIndex < 0) return false;
  return parent?.operands?.[drag.startIndex]?.id === drag.item.id;
}
