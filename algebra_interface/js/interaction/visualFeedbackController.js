/* ========================================================================== *
 * Shared, semantic visual feedback controller (Nested Hitbox Contract v1)
 * ========================================================================== *
 * The renderer creates the mathematical DOM and semantic hitbox addresses.
 * This controller owns transient decoration only: it NEVER edits the AST,
 * changes the equation's child order, or inserts mathematical notation.
 *
 * Scope each feedback channel by an owner key (e.g. 'distribution-preview')
 * so clearing one gesture does not accidentally clear another feature's
 * selection or mathematical preview. Existing feature-specific effects can
 * migrate to these semantic roles incrementally.
 * ========================================================================== */
export const FEEDBACK_ROLES = Object.freeze({
  HOVER: 'hover',
  ELIGIBLE: 'eligible',
  REJECTED: 'rejected',
  PROPOSED_INSERTION: 'proposed-insertion',
  SELECTED: 'selected',
  GROUPING: 'grouping',
});

const ROLE_CLASS = Object.freeze({
  hover: 'is-hitbox-hovered',
  eligible: 'math-feedback--eligible',
  rejected: 'math-feedback--rejected',
  'proposed-insertion': 'math-feedback--proposed-insertion',
  selected: 'math-feedback--selected',
  grouping: 'math-feedback--grouping',
});

export function createVisualFeedbackController(root) {
  const owners = new Map();
  function clear(owner) {
    const previous = owners.get(owner);
    if (!previous) return;
    for (const { element, className, hint, previousHint } of previous) {
      element.classList.remove(className);
      // Only remove a hint that this owner installed. Restore any pre-existing
      // annotation so independent feedback channels do not lose their state.
      if (hint && element.dataset?.mathFeedbackHint === hint) {
        if (previousHint === undefined) delete element.dataset.mathFeedbackHint;
        else element.dataset.mathFeedbackHint = previousHint;
      }
    }
    owners.delete(owner);
  }
  function show(owner, descriptors) {
    if (typeof owner !== 'string' || !owner) throw new TypeError('Feedback owner must be a nonempty string.');
    if (!Array.isArray(descriptors)) throw new TypeError('Feedback descriptors must be an array.');
    // Validate before clearing an existing channel: malformed requests must
    // not silently destroy the feedback currently visible to the student.
    const next = descriptors.map(({ element, role, hint }) => {
      const className = ROLE_CLASS[role];
      if (!className || !element || !root.contains(element)) {
        throw new TypeError('Unknown feedback role or target outside mathematical view.');
      }
      if (hint !== undefined && (role !== 'eligible' || typeof hint !== 'string' || !hint.trim())) {
        throw new TypeError('Only eligible feedback may include a nonempty contextual hint.');
      }
      return { element, className, hint, previousHint: element.dataset?.mathFeedbackHint };
    });
    clear(owner);
    for (const { element, className, hint } of next) {
      element.classList.add(className);
      if (hint) element.dataset.mathFeedbackHint = hint;
    }
    owners.set(owner, next);
  }
  function clearAll() { for (const owner of [...owners.keys()]) clear(owner); }
  return Object.freeze({ show, clear, clearAll, dispose: clearAll });
}
