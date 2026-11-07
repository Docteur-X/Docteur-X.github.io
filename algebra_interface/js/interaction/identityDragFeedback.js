/* Transient toolbar feedback, deliberately separate from the mathematical tree.
 * The ghost cannot intercept pointer hits; highlighting changes only paint,
 * never box dimensions, so dragging cannot destabilise insertion geometry.
 */
export function describeIdentityTarget(request) {
  if (!request) return 'No valid identity insertion target. Move over an expression or matching operator.';
  const symbol = request.operation === 'Add' ? '+0' : '×1';
  if (request.parentNodeId) return `Insert ${symbol} between operands of this associative operation.`;
  return `Introduce ${symbol} on the ${request.side} of the highlighted expression.`;
}

export function createIdentityDragFeedback(toolbar) {
  let ghost = null;
  let highlighted = null;

  function clearHighlight() {
    highlighted?.classList.remove('identity-drop-target');
    highlighted = null;
  }

  function start(operation, x, y) {
    stop();
    ghost = document.createElement('div');
    ghost.className = 'identity-drag-ghost';
    ghost.textContent = operation === 'Add' ? '+0' : '×1';
    ghost.setAttribute('aria-hidden', 'true');
    document.body.append(ghost);
    move(x, y);
    toolbar.classList.add('identity-toolbar--dragging');
  }

  function move(x, y) {
    if (!ghost) return;
    ghost.style.left = `${x + 16}px`;
    ghost.style.top = `${y + 16}px`;
  }

  function highlight(element) {
    if (element === highlighted) return;
    clearHighlight();
    highlighted = element || null;
    highlighted?.classList.add('identity-drop-target');
  }

  function stop() {
    clearHighlight();
    ghost?.remove();
    ghost = null;
    toolbar.classList.remove('identity-toolbar--dragging');
  }

  return { start, move, highlight, stop };
}
