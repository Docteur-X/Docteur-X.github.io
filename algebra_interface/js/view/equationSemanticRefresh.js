/**
 * Phase 5D-3: synchronize semantic consumers after an equation DOM transition.
 *
 * This view-local adapter deliberately does NOT render the equation, cancel
 * gestures, validate mathematics, own history, or paint feature overlays.
 * Call it only AFTER the new equation DOM is mounted (or emptied). The three
 * consumers must refresh in this order: resolver first, then inspector and
 * structure navigator, both of which depend on the resolver's current index.
 */
export function createEquationSemanticRefresh({ view, resolver, inspector, navigator }) {
  if (!view || typeof view.closest !== 'function' ||
      ![resolver, inspector, navigator].every(value => typeof value?.refresh === 'function')) {
    throw new TypeError('Equation semantic refresh requires a view and three refreshable consumers.');
  }

  return Object.freeze({
    /**
     * Stamp the enclosing view with document/object identity, then refresh
     * consumers against its *current* DOM. Empty objects are valid: consumers
     * must discard their previous references instead of retaining stale IDs.
     */
    refresh({ documentId = null, objectId = null } = {}) {
      const windowElement = view.closest('[data-testid="mathematical-window"]');
      windowElement?.setAttribute('data-object-id', objectId ?? '');
      windowElement?.setAttribute('data-document-id', documentId ?? '');
      resolver.refresh();
      inspector.refresh();
      navigator.refresh();
    }
  });
}
