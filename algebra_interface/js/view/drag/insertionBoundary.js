/**
 * A semantic insertion boundary is an address BETWEEN operands, not a node.
 * `index` is the destination in the sibling sequence AFTER the source has
 * been removed. Geometry is allowed to suggest this index, but it cannot
 * authorise the mathematical rearrangement.
 *
 * Keep this module independent of DOM and of the algebraic rule engine.
 */
import { isTermSequence } from '../../definitions/operators/presentation.js';
export function insertionBoundary({ parentId, index } = {}) {
  if (typeof parentId !== 'string' || !parentId ||
      !Number.isInteger(index) || index < 0) return null;
  return Object.freeze({ kind: 'insertion-boundary', parentId, index });
}

/**
 * Resolve a drag geometry result (a pixel-based insertion index) into a semantic address. The source
 * must still be a direct child of the current associative parent. Insertion
 * slots are numbered 0..(N-1) after removing one of N operands.
 *
 * This is deliberately a STRUCTURAL check, not a commutativity check:
 * `getRearrangementCandidate` remains the sole rule-level eligibility gate.
 */
export function resolveDragInsertionBoundary({ root, parentId, sourceId, target, findNodeById } = {}) {
  if (!root || typeof findNodeById !== 'function' || target?.kind !== 'insert') return null;
  const parent = findNodeById(root, parentId);
  if (!parent || !isTermSequence(parent) ||
      !Array.isArray(parent.operands) || parent.operands.length < 2 ||
      !parent.operands.some(child => child.id === sourceId)) return null;
  if (!Number.isInteger(target.index) || target.index >= parent.operands.length) return null;
  return insertionBoundary({ parentId, index: target.index });
}
