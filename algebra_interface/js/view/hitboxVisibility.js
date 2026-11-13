import { createVisualFeedbackController } from './visualFeedbackController.js';
/* ========================================================================== *
 * Hitbox visibility (presentation-only interaction state)
 * ========================================================================== *
 * The renderer still creates exactly the same hitboxes in either mode.
 * One explicitly resolved hover target is decorated; nested ancestors never
 * inherit a hover outline. Selection and mathematical feedback are separate
 * CSS states and are NEVER cleared by this controller.
 * ========================================================================== */
const HITBOX_VISIBILITY = Object.freeze({ VISIBLE: 'visible', HOVER: 'hover' });

function normalizeHitboxVisibility(value) {
  return value === HITBOX_VISIBILITY.HOVER ? HITBOX_VISIBILITY.HOVER : HITBOX_VISIBILITY.VISIBLE;
}

// `isIdle()` (optional): a nested sum or product's own box (R1, class
// `nested-operation`) is hovered only in an idle view; otherwise the hover
// goes to the box around it, as before R1.
export function createHitboxVisibility(root, host = document.documentElement, { isIdle = () => true } = {}) {
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
    let next = enabled && mode === HITBOX_VISIBILITY.HOVER
      ? target?.closest?.('.term[data-node-id]') ?? null : null;
    if (next?.classList.contains('nested-operation') && !isIdle()) {
      next = next.parentElement?.closest?.('.term[data-node-id]') ?? null;
    }
    const eligible = next && root.contains(next) ? next : null;
    if (eligible === hovered) return;
    clearHover();
    hovered = eligible;
    if (!hovered) return;
    // The term that holds the hovered one is tinted lightly (owner, 13 November
    // 2026), so the structure shows without permanent boxes. Colour only.
    const holder = hovered.parentElement?.closest?.('.term[data-node-id]');
    feedback.show('hitbox-hover', [{ element: hovered, role: 'hover' },
      ...(holder && root.contains(holder) ? [{ element: holder, role: 'hover-parent' }] : [])]);
  }

  return { setMode, updateFromTarget, clearHover, getMode: () => mode };
}
