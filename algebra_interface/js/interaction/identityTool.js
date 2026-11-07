/* Presentation-only preview for toolbar identity insertion.
 * The original equation DOM remains in layout (and retains hit-test geometry).
 * A pointer-transparent candidate is drawn over it; no tree/history changes
 * occur until the student explicitly confirms the proposed identity.
 */
export function createIdentityToolPreview(equation, renderCandidate) {
  const panel = equation.parentElement;
  let overlay = null;
  let activeId = null;
  function clear() {
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
    candidate.querySelectorAll('[data-node-id]').forEach(element => {
      if (element.dataset.nodeId === proposal.identityNodeId) {
        element.classList.add('identity-preview-new');
        element.removeAttribute('tabindex');
        const neighbour = [element.previousElementSibling, element.nextElementSibling]
          .find(node => node?.matches('.plus, .multiply-operator'));
        neighbour?.classList.add('identity-preview-operator');
      }
    });
    overlay.append(candidate);
    panel.append(overlay);
    equation.classList.add('identity-preview-source-hidden');
    activeId = JSON.stringify(proposal.request);
  }
  return { show, clear, setModal: () => panel.classList.add('identity-preview-modal') };
}
