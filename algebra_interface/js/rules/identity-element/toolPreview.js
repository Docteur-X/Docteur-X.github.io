/* Presentation-only preview for toolbar identity insertion.
 * The original equation DOM remains in layout (and retains hit-test geometry).
 * A pointer-transparent candidate is drawn over it; no tree/history changes
 * occur until the student explicitly confirms the proposed identity.
 */
import { createVisualFeedbackController } from '../../view/visualFeedbackController.js';
import { rowNeighbours } from '../../view/rendering/rowChunks.js';


const FEEDBACK_OWNER = 'identity-preview';

export function createIdentityToolPreview(equation, renderCandidate) {
  const panel = equation.parentElement;
  // The candidate overlay sits beside #equation, so feedback is scoped to the
  // panel holding both. This module names a role; the stylesheet owns its look.
  const feedback = createVisualFeedbackController(panel);
  let overlay = null;
  let activeId = null;
  function clear() {
    feedback.clear(FEEDBACK_OWNER);
    overlay?.remove(); overlay = null; activeId = null;
    equation.classList.remove('identity-preview-source-hidden');
    panel.classList.remove('identity-preview-modal');
  }
  function show(proposal) {
    if (!proposal) { clear(); return; }
    if (activeId === JSON.stringify(proposal.request)) return;
    clear();
    overlay = document.createElement('div');
    overlay.className = 'identity-preview-overlay';
    const candidate = renderCandidate(proposal.root);
    let introduced = null;
    candidate.querySelectorAll('[data-node-id]').forEach(element => {
      if (element.dataset.nodeId === proposal.identityNodeId) {
        introduced = element;
        // Behaviour hook only (confirmation and pointer events), never paint.
        element.classList.add('identity-preview-new');
        element.removeAttribute('tabindex');
        const { previous, next } = rowNeighbours(element);
        const neighbour = [previous, next].find(node => node?.matches('.plus, .multiply-operator'));
        neighbour?.classList.add('identity-preview-operator');
      }
    });
    overlay.append(candidate);
    panel.append(overlay);
    if (introduced) feedback.show(FEEDBACK_OWNER, [{ element: introduced, role: 'proposed-insertion' }]);
    equation.classList.add('identity-preview-source-hidden');
    activeId = JSON.stringify(proposal.request);
  }
  return { show, clear, setModal: () => panel.classList.add('identity-preview-modal') };
}
