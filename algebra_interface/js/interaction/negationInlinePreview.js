import { describeNegationCandidate } from '../manipulator/negationVisual.js';
import { createVisualFeedbackController } from './visualFeedbackController.js';
import { bindPreviewConfirmationTargets } from './previewConfirmationTargets.js';

/**
 * View-local negation candidate presentation.
 *
 * This controller owns ONLY the temporary rendered DOM and its visual feedback.
 * The caller owns the mathematical proposal, source stamp, confirmation gate,
 * history and persistence. No AST is mutated or published by this module.
 *
 * The renderer produces the same mathematical layout as the committed view;
 * replacing the view temporarily is essential: appending a second expression
 * would visually disconnect the minus glyph from its newly exposed -1 factor.
 */
export function createNegationInlinePreview({ equation, renderCandidate, onConfirm, onCancel }) {
  const feedback = createVisualFeedbackController(equation);
  let originalNodes = null;
  let unbindConfirmation = null;
  const OWNER = 'negation-inline-candidate';

  function clear() {
    unbindConfirmation?.();
    unbindConfirmation = null;
    feedback.clear(OWNER);
    if (originalNodes !== null) {
      equation.replaceChildren(...originalNodes);
      originalNodes = null;
    }
  }

  function show(candidate) {
    if (originalNodes !== null) throw new Error('Negation preview is already open.');
    const candidateRoot = renderCandidate(candidate.result.root);
    // The mathematical candidate is inert: no selection, drag, or second
    // transformation may be initiated against uncommitted occurrences.
    candidateRoot.classList.add('negation-preview-math');
    // The preview is inert except for explicitly marked amber confirmation
    // targets. CSS grants pointer events only to those occurrences; the rest
    // cannot initiate ordinary mathematical gestures before confirmation.
    candidateRoot.style.pointerEvents = 'none';
    const actions = document.createElement('div');
    actions.className = 'negation-preview-actions';
    actions.dataset.testid = 'negation-preview';
    const label = document.createElement('span');
    // Wording belongs to the semantic visual adapter, not the DOM controller.
    // Compression and expansion use opposite labels but share this preview.
    label.textContent = describeNegationCandidate(candidate).label;
    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.dataset.testid = 'confirm-negation';
    confirm.textContent = 'Confirm';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.dataset.testid = 'cancel-negation';
    cancel.textContent = 'Cancel';
    confirm.addEventListener('click', onConfirm);
    cancel.addEventListener('click', onCancel);
    actions.append(label, confirm, cancel);

    originalNodes = [...equation.childNodes];
    equation.replaceChildren(candidateRoot, actions);
    // Only the newly introduced numerical occurrence receives the semantic
    // insertion role. The Group and all original operands remain neutral.
    const inserted = new Set(candidate.result.insertedNodeIds || []);
    const targets = [...candidateRoot.querySelectorAll('[data-hitbox-role="occurrence"][data-node-id]')]
      .filter(element => inserted.has(element.dataset.nodeId));
    // Compression creates an operator, not a new numerical occurrence.
    // The renderer addresses that operator by its owning Negate node ID.
    const operatorOwners = new Set(candidate.result.insertedOperatorOwnerIds || []);
    targets.push(...[...candidateRoot.querySelectorAll('[data-hitbox-role="operator"][data-operator-owner-id]')]
      .filter(element => operatorOwners.has(element.dataset.operatorOwnerId)));
    feedback.show(OWNER, targets.map(element => ({ element, role: 'proposed-insertion' })));
    // This is a generic preview activation binding, not a mathematical rule.
    // The shared commit lifecycle still validates the source and commits once.
    unbindConfirmation = bindPreviewConfirmationTargets({ root: candidateRoot, targets, onConfirm });
  }

  return Object.freeze({ show, clear, dispose: clear });
}
