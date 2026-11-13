import { createTransformationCommitLifecycle } from './transformationCommitLifecycle.js';

/**
 * View-local owner of one feature's modal preview transaction.
 * The mathematical engine produces the proposal; the host owns the lease,
 * single-use confirmation gate, presentation lifetime, and terminal cleanup.
 * A feature supplies only presentation and persistence adapters.
 *
 * This is deliberately a first migration slice, not yet a global replacement
 * for every feature-specific preview. The shared ownership registry prevents
 * this host from competing with previews that have not been migrated.
 */
export function createPreviewSessionHost({ ownership, viewId, owner, presentation }) {
  if (!ownership || typeof ownership.acquire !== 'function' ||
      typeof ownership.release !== 'function' ||
      typeof viewId !== 'string' || !viewId ||
      typeof owner !== 'string' || !owner ||
      !presentation || typeof presentation.show !== 'function' ||
      typeof presentation.clear !== 'function') {
    throw new TypeError('Preview host requires ownership, identity and presentation ports');
  }
  const lifecycle = createTransformationCommitLifecycle();
  let lease = null;
  let serial = 0;

  function cancel() {
    if (!lifecycle.isOpen() && !lease) return;
    lifecycle.cancel();
    const previous = lease;
    lease = null;
    // End the preview mode FIRST, then remove its presentation. While
    // presentation.clear() runs (toolbars, overlays, re-render), the view
    // must already read as "not previewing", because that code asks the view
    // mode which controls to show. Releasing first also means a failing
    // clear() can never leave the view stuck in preview mode.
    if (previous) ownership.release(previous);
    presentation.clear();
  }

  return Object.freeze({
    isOpen() { return lifecycle.isOpen() || lease !== null; },
    open({ candidate, stamp, onShown }) {
      if (lease || lifecycle.isOpen()) return false;
      if (!candidate?.result?.root || !stamp) return false;
      const acquisition = ownership.acquire({
        viewId, owner, documentId: stamp.documentId, objectId: stamp.objectId,
        sessionToken: `${owner}-preview-${++serial}`
      });
      if (acquisition.status !== 'acquired') return false;
      lease = acquisition.lease;
      if (!lifecycle.open(candidate, stamp)) {
        ownership.release(lease);
        lease = null;
        return false;
      }
      try {
        presentation.show(candidate);
        onShown?.(candidate);
        return true;
      } catch (error) {
        try { cancel(); } catch (cleanupError) {
          // Preserve the presentation failure while making cleanup observable.
          console.error('Preview cleanup failed after opening error:', cleanupError);
        }
        throw error;
      }
    },
    confirm(stamp, commit) {
      // A view teardown or external invalidation revokes the lease even if
      // the mathematical source stamp happens to remain unchanged. Never
      // commit an orphaned candidate from a no-longer-authoritative view.
      if (lease && !ownership.owns(lease)) {
        cancel();
        return { status: 'invalidated' };
      }
      // Consume the proposal before callbacks. Preserve the primary commit
      // exception if presentation cleanup also fails; the lease is released
      // by cancel()'s finally regardless of that secondary failure.
      let result;
      let primaryError;
      try {
        result = lifecycle.confirm(stamp, commit);
      } catch (error) {
        primaryError = error;
      }
      try {
        cancel();
      } catch (cleanupError) {
        if (!primaryError) {
          // The mathematical commit has already happened. Returning its outcome
          // with a secondary cleanup error prevents callers from announcing a
          // failed commit (and possibly encouraging an unsafe retry).
          return Object.freeze({ ...result, cleanupError });
        }
        console.error('Preview cleanup failed after commit error:', cleanupError);
      }
      if (primaryError) throw primaryError;
      return result;
    },
    cancel
  });
}
