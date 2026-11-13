import { childEntries, nodeTypeInfo } from '../../engine/nodeRegistry.js';

/**
 * Semantic presentation map: a read-only inventory of mathematical occurrences.
 *
 * This is NOT a second AST, a layout engine, or a source of mathematical truth.
 * It records every occurrence (including operation roots without DOM hitboxes)
 * so developer tools can distinguish mathematical addressability from current
 * pointer-target geometry. Never mutate nodes or assign replacement IDs here.
 */
export function mapMathematicalOccurrences(root) {
  if (!root || typeof root !== 'object') throw new TypeError('Expected an expression root');
  const entries = [];
  const seen = new Set();
  function visit(node, parentId = null, depth = 0, relation = 'root') {
    if (!node || typeof node !== 'object' || !node.id || !node.type) {
      throw new TypeError('Invalid mathematical occurrence');
    }
    if (seen.has(node.id)) throw new TypeError(`Repeated occurrence ID: ${node.id}`);
    seen.add(node.id);
    entries.push({ nodeId: node.id, type: node.type, parentId, depth, relation });
    // Children through the node registry; labels as before:
    // 'left' / 'right', 'operand', 'operand:i' (operands), 'argument:i' (arguments).
    for (const { child, index } of childEntries(node)) {
      // A list child is labelled by its list's name, singular: operands → operand.
      const label = typeof index === 'number'
        ? `${nodeTypeInfo(node).children.key.replace(/s$/, '')}:${index}` : index;
      visit(child, node.id, depth + 1, label);
    }
  }
  visit(root);
  return entries;
}

/**
 * Match mathematical occurrences to the CURRENT rendered DOM. An operation
 * can be represented by a content container rather than an occurrence hitbox;
 * that is explicitly reported rather than silently invented as a hitbox.
 */
export function mapRenderedOccurrences(entries, view) {
  return entries.map(entry => {
    const elements = [...view.querySelectorAll('[data-node-id]')]
      .filter(element => element.dataset.nodeId === entry.nodeId);
    const occurrenceTargets = elements.filter(element => element.dataset.hitboxRole === 'occurrence');
    const operatorTargets = [...view.querySelectorAll('[data-operator-owner-id]')]
      .filter(element => element.dataset.operatorOwnerId === entry.nodeId);
    const contentContainers = [...view.querySelectorAll('[data-parent-id]')]
      .filter(element => element.dataset.parentId === entry.nodeId && element.dataset.hitboxRole === 'content');
    return {
      ...entry,
      occurrenceTargets: occurrenceTargets.length,
      operatorTargets: operatorTargets.length,
      contentContainers: contentContainers.length,
      directlyTargetable: occurrenceTargets.length > 0,
      representation: occurrenceTargets.length ? 'occurrence' :
        contentContainers.length ? 'content-only' : operatorTargets.length ? 'operator-only' : 'no-direct-target'
    };
  });
}
