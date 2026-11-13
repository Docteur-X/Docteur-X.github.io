/**
 * Phase 3D-4: a discrete, view-local command adapter for activating a Negate
 * operator. The operator is not a draggable occurrence. Pointer clicks and
 * keyboard activation submit the same mathematical intention.
 *
 * The caller must supply a coordinator-validated detached candidate; this
 * adapter cannot infer mathematical legality from a DOM class or node type.
 * It never mutates the AST, displays a preview, or publishes history.
 */
export function arbitrateNegationOperator({ arbitrateIntents, session,
  sourceValid, modalBlocked = false, action, candidate } = {}) {
  const validSession = Boolean(session && typeof session === 'object' &&
    typeof session.viewId === 'string' && session.viewId.length > 0 &&
    typeof session.objectId === 'string' && session.objectId.length > 0 &&
    typeof session.sessionToken === 'string' && session.sessionToken.length > 0);
  const nodeId = action?.parameters?.negateNodeId;
  const validAction = action?.ruleId === 'negation.expand' &&
    typeof nodeId === 'string' && nodeId.length > 0;
  // The coordinator must have validated the exact action, not merely returned
  // some candidate root. No synthetic candidate is accepted as evidence.
  const validated = validAction && candidate?.action?.ruleId === action.ruleId &&
    candidate.action.parameters?.negateNodeId === nodeId &&
    Boolean(candidate?.result?.root);
  const proposals = validSession && validated ? [{
    kind: 'negation-expand', viewId: session.viewId, objectId: session.objectId,
    sessionToken: session.sessionToken, eligible: true,
    sourceOccurrenceId: nodeId,
    evidence: 'coordinator-validated-negation-expansion'
  }] : [];
  return arbitrateIntents({
    viewId: session?.viewId, objectId: session?.objectId,
    sessionToken: session?.sessionToken, owner: 'negation-operator',
    active: validSession, sourceValid, modalBlocked, proposals
  });
}
