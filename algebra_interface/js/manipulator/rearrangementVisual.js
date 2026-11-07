/**
 * Describe a validated rearrangement without moving DOM nodes or changing ASTs.
 * The existing rearrangementPreview/dragFeedback implementation owns animation,
 * stable hit-test geometry, faded source, and transient destination rendering.
 */
export function describeRearrangementFeedback(candidate) {
  const p = candidate?.action?.parameters;
  const result = candidate?.result;
  if (!p || !result || !Array.isArray(result.visualOrder)) return null;
  return Object.freeze({
    kind: 'rearrangement',
    sourceNodeId: p.draggedNodeId,
    parentNodeId: p.parentId,
    destinationIndex: p.destinationIndex,
    visualOrder: Object.freeze([...result.visualOrder]),
    confirmationMode: 'immediate'
  });
}
