/**
 * View-local FLIP layout transition for surviving expression hitboxes.
 *
 * This module is intentionally PRESENTATIONAL. The renderer, AST and gesture
 * coordinator remain authoritative. Capture must occur before replaceChildren,
 * and animate must occur after the new mathematical DOM is mounted.
 * The stable data-node-id links old/new geometry; no mathematical nodes are
 * created or mutated here. This preserves the existing one-frame transition.
 */
const SELECTOR = '.add-operand, .factor-slot';

export function createEquationLayoutTransition({ root, prefersReducedMotion, requestFrame }) {
  if (!root || typeof root.querySelectorAll !== 'function' ||
      typeof prefersReducedMotion !== 'function' || typeof requestFrame !== 'function') {
    throw new TypeError('Equation layout transition requires a root and animation callbacks.');
  }

  function capture(animate = true) {
    if (!animate || prefersReducedMotion()) return null;
    const firstRects = new Map();
    root.querySelectorAll('[data-node-id]').forEach(element => {
      if (element.matches(SELECTOR)) {
        firstRects.set(element.dataset.nodeId, element.getBoundingClientRect());
      }
    });
    return firstRects;
  }

  function animate(firstRects) {
    if (!firstRects) return;
    root.querySelectorAll(SELECTOR).forEach(element => {
      const first = firstRects.get(element.dataset.nodeId);
      if (!first) return;
      const last = element.getBoundingClientRect();
      const deltaX = first.left - last.left;
      const deltaY = first.top - last.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
      element.style.transition = 'none';
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      element.getBoundingClientRect(); // Apply the inverted geometry before the next frame.
      requestFrame(() => {
        element.style.transition = '';
        element.style.transform = '';
      });
    });
  }

  return Object.freeze({ capture, animate });
}
