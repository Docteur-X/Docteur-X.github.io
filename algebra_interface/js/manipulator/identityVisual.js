/** Visual semantics for identity introduction, separate from AST rendering.
 * The renderer/identity overlay chooses actual DOM; this descriptor only
 * identifies the introduced occurrence and the mathematical source target.
 */
export function describeIdentityPreview(candidate) {
  if (!candidate?.result?.identityNodeId) return null;
  const request = candidate.action.parameters;
  return Object.freeze({ kind: 'identity-introduction',
    proposedRoot: candidate.result.root,
    confirmationNodeId: candidate.result.identityNodeId,
    highlightedNodeIds: request.targetNodeId ? [request.targetNodeId] : [],
    introducedNodeIds: [candidate.result.identityNodeId] });
}
