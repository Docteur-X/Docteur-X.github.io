/**
 * Mount one fully rendered equation and synchronise its view-local consumers.
 *
 * This is the DOM replacement boundary, NOT an AST renderer or preview host.
 * Callers decide preview lifetime and build the detached tree beforehand.
 * The order is deliberately fixed:
 *   1. Invalidate old semantic addresses before removing their elements.
 *   2. Replace the equation's children atomically.
 *   3. Re-index the new semantic hitboxes before any consumers inspect them.
 *   4. Clear hover and tell the rules the equation is mounted (afterMount).
 *   5. Update layout-affecting toolbars BEFORE measuring visual overlays.
 *   6. Paint the selection and the rules' decorations, then animate layout.
 *
 * Keep this function small and synchronous. It does not own mathematical state,
 * preview leases, history, or feature-specific cancellation decisions.
 */
export function mountEquationPresentation({
  equation, tree, resolver, semanticRefresh, documentId, objectId,
  clearHover, afterMount, updateToolbars, paintSelection, paintDecorations,
  animateLayout, firstRects
}) {
  if (typeof equation?.replaceChildren !== 'function' ||
      typeof resolver?.invalidate !== 'function' ||
      typeof semanticRefresh?.refresh !== 'function' ||
      ![clearHover, afterMount, updateToolbars, paintSelection, paintDecorations, animateLayout].every(fn => typeof fn === 'function')) {
    throw new TypeError('Equation presentation mount requires its DOM and refresh collaborators.');
  }
  // Rendering can fail after the old DOM has been detached (for example,
  // because a toolbar or overlay callback throws). Never leave the resolver
  // advertising addresses for a partially mounted view. The next successful
  // render will rebuild the index from the live DOM.
  resolver.invalidate();
  try {
    // A null tree means an empty Mathematical Object, not a text node.
    equation.replaceChildren(...(tree == null ? [] : [tree]));
    semanticRefresh.refresh({ documentId, objectId });
    clearHover();
    afterMount();
    updateToolbars();
    paintSelection();
    paintDecorations();
    animateLayout(firstRects);
  } catch (error) {
    // Preserve the original failure even if defensive invalidation fails.
    try { resolver.invalidate(); } catch { /* original error takes precedence */ }
    throw error;
  }
}
