/**
 * Phase 3D-5: pure routing of non-transforming selection versus deliberate
 * keyboard commands. This module deliberately does NOT submit intents to the
 * mathematical arbiter: selecting an occurrence is not a transformation.
 *
 * Callers retain ownership of DOM events, focus, mathematical eligibility,
 * previews, and commit. The routing decision is view-local and ephemeral.
 */
export function shouldCompleteTouchTap(context = {}) {
  if (!context || typeof context !== "object") return false;
  // viewBusy: a preview is open or a rule's own drag or tool holds the view.
  const { tap, pointerId, moved, activeDrag, viewBusy } = context;
  // A pointer-up from another contact must never consume this contact's tap.
  return Boolean(tap && tap.pointerId === pointerId && !moved &&
    !activeDrag && viewBusy === false);
}

/**
 * Classify the existing keyboard vocabulary, not its mathematical validity.
 * Only the caller can decide whether a focused occurrence is eligible.
 * `none` leaves the event alone (including native button activation).
 */
export function classifyOccurrenceKey(context = {}) {
  if (!context || typeof context !== "object") return "none";
  const { key, ctrlKey = false, metaKey = false } = context;
  if (typeof key !== 'string') return 'none';
  if ((key === 'Enter' || key === ' ') && (ctrlKey || metaKey)) return 'toggle-selection';
  if (key === 'Enter' || key === ' ') return 'select';
  if (key.toLowerCase() === 'd') return 'request-distribution';
  if (key === 'ArrowLeft' || key === 'ArrowRight') return 'request-rearrangement';
  return 'none';
}
