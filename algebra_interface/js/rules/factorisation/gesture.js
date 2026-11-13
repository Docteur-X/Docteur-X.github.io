/**
 * Factor extraction gesture adapter. Selection and extraction-zone geometry
 * are handled elsewhere; this converts a validated-looking plan into a
 * DOM-free request. The Engine and teaching policy remain authoritative.
 */
export function factorisationActionRequest(plan) {
  if (!plan || !['left', 'right'].includes(plan.direction) ||
      typeof plan.sumId !== 'string' || !plan.sumId ||
      !Array.isArray(plan.sourceFactorIds) || plan.sourceFactorIds.length < 2 ||
      plan.sourceFactorIds.some(id => typeof id !== 'string' || !id) ||
      new Set(plan.sourceFactorIds).size !== plan.sourceFactorIds.length) return null;
  return Object.freeze({
    ruleId: `factorisation.${plan.direction}`,
    parameters: Object.freeze({
      direction: plan.direction, sumId: plan.sumId,
      groupId: plan.groupId ?? null,
      sourceFactorIds: Object.freeze([...plan.sourceFactorIds]),
      productIds: Object.freeze([...plan.productIds])
    })
  });
}
