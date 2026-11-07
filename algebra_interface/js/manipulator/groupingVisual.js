/**
 * Range grouping's presentation semantics. The existing inert blue overlay
 * owns bracket drawing, focus, and click-through geometry; this descriptor
 * only identifies what the preview should explain, not how to draw it.
 */
export function describeGroupingPreview(candidate) {
  const plan = candidate?.result?.plan;
  const style = candidate?.action?.parameters?.bracketStyle;
  if (!plan || !style) return null;
  return Object.freeze({
    kind: 'range-grouping',
    parentNodeId: plan.parentId,
    selectedNodeIds: Object.freeze([...plan.operandIds]),
    bracketStyle: style,
    confirmationRole: 'grouping-envelope'
  });
}
