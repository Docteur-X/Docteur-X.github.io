/**
 * Presentation semantics for distribution. The existing renderer owns the
 * notation and the established overlay owns arrows/amber factor copies.
 * No mathematical validity, DOM mutation or history commits happen here.
 */
export function describeDistributionPreview(candidate) {
  const plan = candidate?.result?.plan;
  if (!plan) return null;
  return Object.freeze({
    kind: 'distribution', direction: plan.direction,
    sourceNodeId: plan.sourceFactorId, targetSumId: plan.sumId,
    highlightedNodeIds: Object.freeze([plan.sourceFactorId, plan.sumId]),
    confirmationRole: 'distributed-factor-copy'
  });
}
