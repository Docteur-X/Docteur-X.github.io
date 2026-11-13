/**
 * Phase 3D-3: advisory gate for a deliberate range-grouping preview request.
 *
 * Multi-selection (Ctrl/Cmd+click or touch taps) remains non-transforming.
 * This adapter only accepts an existing mathematical grouping plan, a valid
 * grouping action, and a coordinator-validated detached candidate. It never
 * edits the AST, creates previews, or publishes history.
 */
export function arbitrateGroupingPreview({ arbitrateIntents, session, sourceValid,
  modalBlocked = false, plan, action, candidate } = {}) {
  const validSession = session && typeof session === 'object' &&
    typeof session.viewId === 'string' && session.viewId.length > 0 &&
    typeof session.objectId === 'string' && session.objectId.length > 0 &&
    typeof session.sessionToken === 'string' && session.sessionToken.length > 0;
  const validPlan = plan && (plan.parentType === 'Add' || plan.parentType === 'Multiply') &&
    typeof plan.parentId === 'string' && plan.parentId.length > 0 &&
    Array.isArray(plan.operandIds) && plan.operandIds.length >= 2 &&
    plan.operandIds.every(id => typeof id === 'string' && id.length > 0) &&
    new Set(plan.operandIds).size === plan.operandIds.length;
  const validAction = action?.ruleId === 'grouping.range' &&
    action.parameters?.parentId === plan?.parentId &&
    action.parameters?.parentType === plan?.parentType &&
    Array.isArray(action.parameters?.operandIds) &&
    validPlan && action.parameters.operandIds.length === plan.operandIds.length &&
    action.parameters.operandIds.every((id, index) => id === plan.operandIds[index]);
  const eligible = validSession && sourceValid === true && modalBlocked === false &&
    validAction && Boolean(candidate?.result?.plan) &&
    // Candidate agreement includes the associative operator type. Matching IDs
    // alone cannot establish that the coordinator validated the same grouping.
    candidate.result.plan.parentType === plan.parentType &&
    candidate.result.plan.parentId === plan.parentId &&
    Array.isArray(candidate.result.plan.operandIds) &&
    candidate.result.plan.operandIds.length === plan.operandIds.length &&
    candidate.result.plan.operandIds.every((id, i) => id === plan.operandIds[i]);
  const proposals = eligible ? [{
    kind: 'group', viewId: session.viewId, objectId: session.objectId,
    sessionToken: session.sessionToken, eligible: true,
    sourceOccurrenceId: plan.parentId,
    evidence: 'validated-grouping-plan-and-coordinator-candidate'
  }] : [];
  return arbitrateIntents({
    viewId: session?.viewId, objectId: session?.objectId,
    sessionToken: session?.sessionToken, owner: 'grouping',
    active: Boolean(validSession), sourceValid, modalBlocked, proposals
  });
}
