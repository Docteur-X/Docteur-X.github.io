/**
 * AST-based navigation, independent of DOM layout and mathematical rule application.
 * The selected ID is an occurrence identity, never an HTML element identity.
 * A navigation command only changes the current focus; it does not rewrite the AST.
 */
import { mapMathematicalOccurrences } from './rendering/semanticContainerMap.js';

export function navigateStructure(entries, currentId, direction) {
  if (!entries.length) return null;
  const current = entries.find(entry => entry.nodeId === currentId) || entries[0];
  if (direction === 'parent') return entries.find(entry => entry.nodeId === current.parentId)?.nodeId || current.nodeId;
  const children = entries.filter(entry => entry.parentId === current.nodeId);
  if (direction === 'child') return children[0]?.nodeId || current.nodeId;
  if (direction === 'previous' || direction === 'next') {
    if (current.parentId === null) return current.nodeId;
    const siblings = entries.filter(entry => entry.parentId === current.parentId);
    const index = siblings.findIndex(entry => entry.nodeId === current.nodeId);
    return siblings[index + (direction === 'previous' ? -1 : 1)]?.nodeId || current.nodeId;
  }
  throw new TypeError(`Unknown structural navigation direction: ${direction}`);
}

export function createStructureNavigationModel(root) {
  return mapMathematicalOccurrences(root);
}
