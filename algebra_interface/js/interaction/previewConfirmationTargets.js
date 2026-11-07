/**
 * Reusable, view-local confirmation gesture for semantic preview occurrences.
 *
 * A preview owns the gesture, NOT the renderer or Visual Feedback Controller.
 * The renderer supplies occurrence addresses; the feedback controller supplies
 * visual roles; this adapter converts an intentional activation into a request
 * to the caller's existing single-use, stale-safe commit lifecycle.
 *
 * The caller must dispose this binding when replacing or cancelling its preview.
 * Keeping the listener on the candidate root avoids global event listeners and
 * prevents unrelated amber feedback elsewhere from confirming a proposal.
 */
export function bindPreviewConfirmationTargets({ root, targets, onConfirm }) {
  if (!root || !Array.isArray(targets) || typeof onConfirm !== 'function') {
    throw new TypeError('Preview confirmation requires a root, targets and callback.');
  }
  const eligible = new Set(targets);
  for (const target of eligible) {
    if (!root.contains(target)) throw new TypeError('Confirmation target must belong to the preview.');
    target.dataset.previewConfirm = 'true';
    target.tabIndex = 0;
    target.setAttribute('role', 'button');
    target.setAttribute('aria-label', 'Confirm proposed mathematical transformation');
  }
  function activate(event) {
    const target = event.target.closest?.('[data-preview-confirm="true"]');
    if (!eligible.has(target)) return;
    event.preventDefault();
    event.stopPropagation();
    onConfirm();
  }
  function keydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    activate(event);
  }
  root.addEventListener('click', activate);
  root.addEventListener('keydown', keydown);
  return () => {
    root.removeEventListener('click', activate);
    root.removeEventListener('keydown', keydown);
    for (const target of eligible) {
      delete target.dataset.previewConfirm;
      target.removeAttribute('role');
      target.removeAttribute('aria-label');
      target.removeAttribute('tabindex');
    }
  };
}
