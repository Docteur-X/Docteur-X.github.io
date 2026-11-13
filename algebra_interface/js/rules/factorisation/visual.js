/**
 * Describe the educational meaning of a factorisation proposal. The existing
 * one-line preview owns DOM layout, fading and provenance arrows; this module
 * merely supplies semantic node IDs and an explanation role.
 */
export function describeFactorisationPreview(candidate) {
  const plan = candidate?.result?.plan;
  const extractedId = candidate?.result?.extractedFactorId;
  if (!plan || !extractedId) return null;
  return Object.freeze({
    kind: 'factorisation', direction: plan.direction,
    scopeNodeId: plan.scopeNodeId,
    sourceNodeIds: Object.freeze([...plan.sourceFactorIds]),
    resultNodeId: extractedId,
    confirmationRole: 'extracted-factor'
  });
}
