/**
 * Inert rendering (renderer standard, rule 6 / step 8).
 *
 * WHY: three places copied the same lines to make a picture of the
 * mathematics that cannot be focused (the drag ghost, the factorisation ghost
 * and the rearrangement preview). Each copy could drift, and a new copy would
 * have to rediscover the rule. This is the one rule:
 *   - the copy's own box is not a tab stop;
 *   - every focusable part inside it is taken out of the tab order;
 *   - `hidden: true` also hides it from screen readers (a decorative copy).
 *
 * It does NOT block pointer events: a preview may still need its marked
 * confirmation targets (they are granted by CSS). Callers that want a purely
 * decorative copy set `pointer-events: none` or the `inert` attribute.
 */
const FOCUSABLE = new Set(['BUTTON', 'INPUT', 'A']);

export function makeInert(element, { hidden = false } = {}) {
  if (!element) return element;
  element.removeAttribute('tabindex');
  if (hidden) element.setAttribute('aria-hidden', 'true');
  const visit = parent => {
    for (const child of parent.children ?? []) {
      if (child.hasAttribute?.('tabindex') || FOCUSABLE.has(child.tagName)) child.setAttribute('tabindex', '-1');
      visit(child);
    }
  };
  visit(element);
  return element;
}
