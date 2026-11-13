/**
 * The candidate preview (clean-up C2): one presentation for every rule whose
 * preview is "the result, with the new parts in amber".
 *
 * The candidate is drawn in place of the committed expression. Its new
 * occurrences (`result.insertedNodeIds`) and new operators
 * (`result.insertedOperatorOwnerIds`) are marked amber; selecting one of them,
 * or Confirm, commits; Cancel restores the saved DOM exactly. The rest of the
 * candidate is inert (css/previews.css, .candidate-preview-math).
 *
 * It owns only the temporary DOM and its feedback. The preview host owns the
 * proposal, the source stamp and the single-use commit; the rule owns its
 * wording (`describe`).
 *
 * `name` gives the rule's own hooks, kept as they were before C2:
 *   classes  <name>-preview-math, <name>-preview-actions
 *   test ids <name>-preview, confirm-<name>, cancel-<name>
 * The outside-click routes recognise the controls by data-candidate-preview-actions.
 */
import { bindPreviewConfirmationTargets } from './previewConfirmationTargets.js';

export function createCandidatePreview({ name, equation, renderCandidate, feedback, describe, onConfirm, onCancel }) {
  const OWNER = `${name}-candidate`;
  let originalNodes = null;
  let unbind = null;

  function clear() {
    // Each step runs even if an earlier one throws, so the committed view is
    // always restored.
    const unbindNow = unbind;
    unbind = null;
    try { unbindNow?.(); } finally {
      try { feedback.clear(OWNER); } finally {
        if (originalNodes !== null) {
          equation.replaceChildren(...originalNodes);
          originalNodes = null;
        }
      }
    }
  }

  function button(text, testId, onClick, className) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = className;
    element.dataset.testid = testId;
    element.textContent = text;
    element.addEventListener('click', onClick);
    return element;
  }

  function show(candidate) {
    if (originalNodes !== null) throw new Error(`The ${name} preview is already open.`);
    const math = renderCandidate(candidate.result.root);
    math.classList.add('candidate-preview-math', `${name}-preview-math`);
    const actions = document.createElement('div');
    actions.className = `candidate-preview-actions ${name}-preview-actions`;
    actions.dataset.testid = `${name}-preview`;
    actions.dataset.candidatePreviewActions = '';
    const label = document.createElement('span');
    label.textContent = describe(candidate);
    // The equality preview's buttons, for every preview (owner, 12 November 2026).
    actions.append(label, button('Confirm', `confirm-${name}`, onConfirm, 'button button--small'),
      button('Cancel', `cancel-${name}`, onCancel, 'button button--quiet button--small'));

    originalNodes = [...equation.childNodes];
    equation.replaceChildren(math, actions);
    const inserted = new Set(candidate.result.insertedNodeIds || []);
    const targets = [...math.querySelectorAll('[data-hitbox-role="occurrence"][data-node-id]')]
      .filter(element => inserted.has(element.dataset.nodeId));
    // A rule may create an operator rather than an occurrence (negation
    // compression); the renderer addresses it by its owning node's ID.
    const operatorOwners = new Set(candidate.result.insertedOperatorOwnerIds || []);
    targets.push(...[...math.querySelectorAll('[data-hitbox-role="operator"][data-operator-owner-id]')]
      .filter(element => operatorOwners.has(element.dataset.operatorOwnerId)));
    // Only the OUTERMOST new part glows (the equality preview's rule, now for
    // every preview): a new part inside another new part stays neutral, so a
    // rewritten sum shows one halo, not one inside another.
    const outermost = targets.filter(element => !targets.some(other => other !== element && other.contains(element)));
    feedback.show(OWNER, outermost.map(element => ({ element, role: 'proposed-insertion' })));
    unbind = bindPreviewConfirmationTargets({ root: math, targets: outermost, onConfirm });
  }

  return Object.freeze({ show, clear, dispose: clear });
}
