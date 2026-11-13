/**
 * Distribution's gesture adapter translates an eligible factor/plus pairing
 * into a DOM-free action. It does not calculate distribution or draw arrows.
 * The caller's stable hit-test geometry remains the authority for targets.
 */
export function distributionActionRequest(plan) {
  if (!plan || !['left', 'right'].includes(plan.direction) ||
      ![plan.productId, plan.sourceFactorId, plan.sumId].every(id => typeof id === 'string' && id.length)) return null;
  return Object.freeze({
    ruleId: 'multiplication.distribute',
    parameters: Object.freeze({ productId: plan.productId,
      sourceFactorId: plan.sourceFactorId, sumId: plan.sumId,
      direction: plan.direction })
  });
}
