/**
 * Phase 3D (factor-drag increment): pure advisory adapter for extraction-zone
 * release. Geometry and factorisation rules stay in their existing owners.
 *
 * A factor drag can propose only `factorise`. The arbiter decides whether that
 * proposal belongs to the active view/object/session; the existing preview and
 * commit lifecycle still validates the mathematics and publishes history.
 */
export function arbitrateFactorDrop({ arbitrateIntents, drag, inZone,
  sourceValid, modalBlocked = false, validate } = {}) {
  const validSession = drag && typeof drag === 'object' &&
    typeof drag.sourceId === 'string' && drag.sourceId.length > 0 &&
    drag.moved === true;
  const session = {
    viewId: drag?.arbitrationViewId,
    objectId: drag?.arbitrationObjectId,
    sessionToken: drag?.arbitrationSessionToken,
    owner: 'factor-drag',
    active: Boolean(validSession), sourceValid, modalBlocked
  };
  // No mathematical rule is consulted for cancelled, outside-zone, stale,
  // malformed, or modal-blocked releases. This is not a fallback gesture.
  if (!validSession || inZone !== true || sourceValid !== true ||
      modalBlocked !== false || typeof validate !== 'function') {
    return arbitrateIntents({ ...session, proposals: [] });
  }
  let eligible = false;
  try { eligible = validate() === true; }
  catch { /* A changed selection/rerender cannot authorize a preview. */ }
  return arbitrateIntents({ ...session, proposals: [{
    kind: 'factorise', viewId: session.viewId, objectId: session.objectId,
    sessionToken: session.sessionToken, sourceOccurrenceId: drag.sourceId,
    evidence: 'existing-factorisation-plan-and-teaching-policy', eligible
  }] });
}
