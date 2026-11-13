/* ========================================================================== *
 * Persistent multiple selection (interaction state only)
 * ========================================================================== *
 * Selection is NOT a mathematical operation. We deliberately allow selecting
 * nodes from different parents: later, factorisation will need to select a
 * factor from each of several products. Only the requested RULE (e.g. range
 * grouping) decides whether those selected IDs can be transformed.
 *
 * Invariant: do not keep both an ancestor and one of its descendants selected.
 * This avoids ambiguous nested outlines and gestures. Selecting either one
 * replaces the conflicting other selection, while preserving unrelated IDs.
 *
 * This module contains no DOM, keyboard, CSS, or mathematical assumptions.
 * ========================================================================== */
import { walkExpression } from "../engine/treeUtils.js";

/** Build an ancestry map once per selection change; tree sizes are modest. */
function makeParents(root) {
  const parents = new Map();
  walkExpression(root, (node, parent) => parents.set(node.id, parent?.id ?? null));
  return parents;
}

/** True if `ancestorId` is strictly above `nodeId` in this tree. */
function isAncestor(parents, ancestorId, nodeId) {
  let current = parents.get(nodeId);
  while (current != null) {
    if (current === ancestorId) return true;
    current = parents.get(current);
  }
  return false;
}

export function createSelectionModel() {
  // Set preserves insertion order, but mathematical operations must use the
  // order in the PARENT operand array, never the order of Ctrl+clicks.
  const selected = new Set();
  return {
    ids: () => [...selected],
    size: () => selected.size,
    has: (id) => selected.has(id),
    clear() { selected.clear(); },
    replace(root, id) {
      selected.clear();
      const parents = makeParents(root);
      if (id && parents.has(id)) selected.add(id);
      return [...selected];
    },
    toggle(root, id) {
      const parents = makeParents(root);
      if (!parents.has(id)) return [...selected];
      if (selected.has(id)) selected.delete(id);
      else {
        for (const existing of selected) {
          if (isAncestor(parents, existing, id) || isAncestor(parents, id, existing)) {
            selected.delete(existing);
          }
        }
        selected.add(id);
      }
      return [...selected];
    },
    /** Remove IDs that no longer exist, e.g. after history navigation. */
    prune(root) {
      const parents = makeParents(root);
      for (const id of selected) if (!parents.has(id)) selected.delete(id);
    }
  };
}
