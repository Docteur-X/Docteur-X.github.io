import { createVisualFeedbackController } from './visualFeedbackController.js';
/* ========================================================================== *
 * Hitbox visibility (presentation-only interaction state)
 * ========================================================================== *
 * The renderer still creates exactly the same hitboxes in either mode.
 * One explicitly resolved hover target is decorated; nested ancestors never
 * inherit a hover outline. Selection and mathematical feedback are separate
 * CSS states and are NEVER cleared by this controller.
 * ========================================================================== */
export const HITBOX_VISIBILITY = Object.freeze({ VISIBLE: 'visible', HOVER: 'hover' });

export function normalizeHitboxVisibility(value) {
  return value === HITBOX_VISIBILITY.HOVER ? HITBOX_VISIBILITY.HOVER : HITBOX_VISIBILITY.VISIBLE;
}

export function createHitboxVisibility(root, host = document.documentElement) {
  let mode = HITBOX_VISIBILITY.VISIBLE;
  let hovered = null;
  const feedback = createVisualFeedbackController(root);

  function clearHover() {
    feedback.clear('hitbox-hover');
    hovered = null;
  }

  function setMode(value) {
    mode = normalizeHitboxVisibility(value);
    host.dataset.hitboxVisibility = mode;
    clearHover();
    return mode;
  }

  function updateFromTarget(target, enabled = true) {
    // The closest node is the deepest actual mathematical hitbox under the
    // pointer. Do not add classes to parents, children, or selection members.
    const next = enabled && mode === HITBOX_VISIBILITY.HOVER
      ? target?.closest?.('.term[data-node-id]') ?? null : null;
    const eligible = next && root.contains(next) ? next : null;
    if (eligible === hovered) return;
    clearHover();
    hovered = eligible;
    if (hovered) feedback.show('hitbox-hover', [{ element: hovered, role: 'hover' }]);
  }

  return { setMode, updateFromTarget, clearHover, getMode: () => mode };
}
