/**
 * Phase 3C boundary: translate one *settled* ordinary pointer-drop target
 * into the Phase 3B advisory contract. Geometry/preview code retains control
 * of the requested vs. settled distinction. Mathematical rules, supplied by
 * the caller as `validate`, remain the only source of eligibility.
 *
 * This adapter has no DOM access, AST mutation, or commit side effects.
 * Invalid and out-of-bounds targets produce no intent; they cannot trigger
 * an unrelated fallback transformation.
 */
// `ruleKinds` (stage 7): the drop-target kinds rule bundles registered. A
// target of such a kind becomes a generic 'rule-drop' proposal naming it.
export function arbitrateOrdinaryDrop({ arbitrateIntents, drag, target,
  sourceValid, modalBlocked = false, validate, ruleKinds = [] } = {}) {
  // A partially constructed or cancelled session must never reach a rule
  // validator. In particular, do not dereference drag.item until its stable
  // mathematical occurrence identity has been checked.
  const validDrag = drag && typeof drag === 'object' &&
    drag.item && typeof drag.item.id === 'string' && drag.item.id.length > 0;
  const kinds = { distribution: 'distribution', combine: 'combine',
    insert: 'insert', 'negation-compress': 'negation-compress' };
  const ruleTarget = !kinds[target?.kind] && ruleKinds.includes(target?.kind) ? target.kind : null;
  const kind = kinds[target?.kind] ?? (ruleTarget ? 'rule-drop' : undefined);
  const session = {
    viewId: drag?.arbitrationViewId,
    objectId: drag?.arbitrationObjectId,
    sessionToken: drag?.arbitrationSessionToken,
    owner: 'ordinary-drag', active: Boolean(validDrag),
    sourceValid, modalBlocked
  };
  // Validation is never called for invalid geometry or an untrusted session.
  // The arbiter itself checks the session context and rejects stale sources.
  const validTarget = kind === 'insert'
    ? Number.isSafeInteger(target?.index) && target.index >= 0
    : typeof target?.id === 'string' && target.id.length > 0;
  if (!kind || !validDrag || !validTarget || sourceValid !== true ||
      modalBlocked !== false || typeof validate !== 'function') {
    return arbitrateIntents({ ...session, proposals: [] });
  }
  // Eligibility is advisory. A rule adapter can reject or throw while a
  // gesture is ending (for example after a rerender). Fail closed; the
  // existing preview/commit gate still independently revalidates the AST.
  let eligible;
  try { eligible = validate() === true; }
  catch { return arbitrateIntents({ ...session, proposals: [] }); }
  const proposal = {
    kind, viewId: session.viewId, objectId: session.objectId,
    sessionToken: session.sessionToken, eligible,
    sourceOccurrenceId: drag.item.id, evidence: 'existing-mathematical-rule',
    ...(ruleTarget ? { ruleTarget } : {})
  };
  if (kind === 'insert') {
    proposal.insertionIndex = target.index;
    // activeTarget is only assigned from dragFeedback.show's settled result.
    // Never accept the requestedTarget directly here.
    proposal.settled = true;
  } else {
    proposal.targetOccurrenceId = target.id;
  }
  return arbitrateIntents({ ...session, proposals: [proposal] });
}
