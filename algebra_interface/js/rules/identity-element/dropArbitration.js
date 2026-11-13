/**
 * Phase 3D-2: advisory identity-toolbar release adapter.
 *
 * Pointer geometry and identity action interpretation belong to identityGesture;
 * mathematical eligibility belongs to the existing transformation coordinator.
 * This module neither creates candidates nor commits history. It only verifies
 * that an active, source-valid toolbar gesture has one eligible identity intent.
 */
export function arbitrateIdentityDrop({ arbitrateIntents, drag, sourceValid,
  modalBlocked = false, actionValid = false } = {}) {
  const validDrag = drag && typeof drag === 'object' &&
    (drag.operation === 'Add' || drag.operation === 'Multiply') &&
    Number.isSafeInteger(drag.pointerId) && drag.pointerId >= 0;
  const session = {
    viewId: drag?.arbitrationViewId,
    objectId: drag?.arbitrationObjectId,
    sessionToken: drag?.arbitrationSessionToken,
    owner: 'identity-drag',
    active: Boolean(validDrag),
    sourceValid,
    modalBlocked
  };
  // No fallback to ordinary dragging, and no interpretation of DOM geometry.
  // A missing proposal is a normal release outside an eligible target.
  const proposals = validDrag && sourceValid === true && modalBlocked === false &&
    actionValid === true ? [{
      kind: 'identity', viewId: session.viewId, objectId: session.objectId,
      sessionToken: session.sessionToken, eligible: true,
      evidence: 'existing-identity-action-and-coordinator-candidate'
    }] : [];
  return arbitrateIntents({ ...session, proposals });
}
