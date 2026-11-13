/**
 * Phase 3B: pure, view-local decision seam for already-derived gesture intents.
 *
 * This module deliberately does NOT inspect DOM, perform hit testing, evaluate
 * mathematical rules, animate previews, or publish transformations. Callers
 * supply explicit eligibility and source-state evidence. The existing app.js
 * gesture dispatch remains authoritative until the Phase 3C migration.
 *
 * The narrow decision policy below mirrors observed ordinary-drag precedence,
 * not a global priority ordering across every possible mathematical action.
 */

// 'rule-drop' (stage 7): a drop on a target kind that a rule bundle
// registered (registerDropTarget); `ruleTarget` names that kind. It lets a new
// bundle's drop reach its rule without editing this list.
const KINDS = new Set([
  'distribution', 'combine', 'insert', 'negation-compress',
  'rearrange', 'factorise', 'group', 'identity', 'negation-expand', 'rule-drop'
]);
const GESTURE_OWNERS = new Set(['ordinary-drag', 'factor-drag', 'identity-drag',
  'grouping', 'negation-operator', 'keyboard', 'touch-selection']);
// Explicit capability map: do not infer permission from a broad 'non-drag' bucket.
// Keyboard and touch selection are intentionally non-transforming in this advisory
// seam until their real command adapters are characterized during Phase 3D.
const OWNER_KINDS = Object.freeze({
  'ordinary-drag': new Set(['distribution', 'combine', 'insert', 'negation-compress', 'rearrange', 'rule-drop']),
  'factor-drag': new Set(['factorise']),
  'identity-drag': new Set(['identity']),
  grouping: new Set(['group']),
  'negation-operator': new Set(['negation-expand']),
  keyboard: new Set(),
  'touch-selection': new Set()
});

// Identity is a mathematical intent, not a recognizer instance. Distinct
// recognizers reporting the same action should not manufacture ambiguity.
const ACTION_FIELDS = ['kind', 'ruleTarget', 'sourceOccurrenceId', 'targetOccurrenceId', 'insertionIndex'];
function sameAction(a, b) {
  return ACTION_FIELDS.every(field => a[field] === b[field]);
}
function snapshotProposal(proposal) {
  // Only known, primitive-valued contract fields are exported; never carry
  // mutable recognizer-owned metadata into an advisory decision.
  const fields = ['kind', 'viewId', 'objectId', 'sessionToken', 'eligible',
    'settled', ...ACTION_FIELDS.slice(1), 'evidence'];
  return Object.freeze(Object.fromEntries(fields.filter(field =>
    Object.hasOwn(proposal, field)).map(field => [field, proposal[field]])));
}

/**
 * @typedef {Object} IntentProposal
 * @property {string} kind - Discriminant, not a CSS class or DOM selector.
 * @property {string} viewId - Identity of the presenting view.
 * @property {string} objectId - Mathematical Object identity.
 * @property {string} sessionToken - Unique token from the gesture owner.
 * @property {boolean} eligible - Result of validation elsewhere, NEVER inferred here.
 * @property {boolean} [settled] - False for insertion/rearrangement still animating.
 * @property {string} [sourceOccurrenceId]
 * @property {string} [targetOccurrenceId]
 * @property {number} [insertionIndex]
 * @property {string} [evidence] - Diagnostic origin, NOT proof of rule validity.
 * @property {boolean} [settled] - Required true for committable insert/rearrange.
 *
 * Eligibility provenance: a trusted feature adapter must obtain `eligible`
 * from the existing mathematical rule/gesture checks. This pure module cannot
 * authenticate that assertion. The existing commit lifecycle MUST revalidate
 * source fingerprint and mathematical legality before publishing.
 */

const result = (status, reason, sessionToken, proposal) =>
  Object.freeze({ status, reason, sessionToken, ...(proposal ? { proposal } : {}) });

/**
 * Select at most one eligible proposal for a single gesture session.
 *
 * The arbiter refuses ambiguous proposals instead of silently using array
 * order. The one specific override is eligible -1 compression over an ordinary
 * geometric candidate, matching app.js. Geometric precedence is distribution
 * over combination over insertion, but ONLY within an ordinary-drag session.
 * Feature-specific recognizers must have already established eligibility.
 *
 * `sourceValid` is supplied by the caller's AST/fingerprint check. `active`
 * means the session has not been cancelled or superseded. `modalBlocked`
 * blocks incompatible new input. All three are mandatory booleans: absent
 * evidence must never be interpreted as permission to commit.
 *
 * Results are advisory until Phase 3C: they do not authorize publication.
 */
export function arbitrateIntents({
  viewId, objectId, sessionToken, owner, proposals = [],
  active, sourceValid, modalBlocked = false
} = {}) {
  if (typeof viewId !== 'string' || !viewId || typeof objectId !== 'string' || !objectId ||
      typeof sessionToken !== 'string' || !sessionToken || !GESTURE_OWNERS.has(owner)) {
    return result('blocked', 'invalid-session', sessionToken);
  }
  if (active !== true) return result('blocked', 'inactive-session', sessionToken);
  if (sourceValid !== true) return result('blocked', 'stale-source', sessionToken);
  if (modalBlocked !== false) return result('blocked', 'modal-active', sessionToken);
  if (!Array.isArray(proposals)) return result('blocked', 'invalid-proposals', sessionToken);

  const eligible = [];
  for (const proposal of proposals) {
    if (!proposal || typeof proposal !== 'object' || !KINDS.has(proposal.kind) ||
        proposal.viewId !== viewId || proposal.objectId !== objectId ||
        proposal.sessionToken !== sessionToken || typeof proposal.eligible !== 'boolean') {
      return result('blocked', 'invalid-proposal-context', sessionToken);
    }
    if (!OWNER_KINDS[owner].has(proposal.kind)) {
      return result('blocked', 'wrong-gesture-owner', sessionToken);
    }
    // Keep the advisory result's shape strictly primitive and immutable.
    if (['ruleTarget', 'sourceOccurrenceId', 'targetOccurrenceId', 'evidence'].some(field =>
      Object.hasOwn(proposal, field) && typeof proposal[field] !== 'string') ||
      (Object.hasOwn(proposal, 'insertionIndex') &&
       (!Number.isSafeInteger(proposal.insertionIndex) || proposal.insertionIndex < 0)) ||
      (Object.hasOwn(proposal, 'settled') && typeof proposal.settled !== 'boolean')) {
      return result('blocked', 'invalid-proposal-data', sessionToken);
    }
    if (!proposal.eligible) continue;
    if ((proposal.kind === 'insert' || proposal.kind === 'rearrange') && proposal.settled !== true) {
      continue; // An unsettled preview is never a committable proposal.
    }
    eligible.push(proposal);
  }
  if (eligible.length === 0) return result('none', 'no-eligible-intent', sessionToken);

  let candidates = eligible;
  if (owner === 'ordinary-drag') {
    // These are *specific* observed drop-target precedences, not global scores.
    // A rule-owned drop target was found by its rule under the pointer, so it
    // ranks with negation's (also rule-owned) above the shared geometry.
    for (const kind of ['negation-compress', 'rule-drop', 'distribution', 'combine', 'insert', 'rearrange']) {
      const matches = eligible.filter(p => p.kind === kind);
      if (matches.length) { candidates = matches; break; }
    }
  }
  // Collapse exact duplicates, but never silently choose between distinct
  // targets. Recognizer iteration order must not affect mathematical intent.
  const distinct = [];
  for (const candidate of candidates) {
    if (!distinct.some(existing => sameAction(existing, candidate))) distinct.push(candidate);
  }
  if (distinct.length !== 1) return result('blocked', 'ambiguous-intents', sessionToken);
  return result('chosen', 'eligible-intent', sessionToken, snapshotProposal(distinct[0]));
}
