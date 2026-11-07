/**
 * A DOM-free, single-use proposal/commit gate for mathematical transformations.
 *
 * Mathematical Objects and their histories remain authoritative. This module
 * neither rewrites trees nor writes history: a feature supplies its already
 * validated candidate, and the application supplies the actual commit callback.
 *
 * A source stamp includes document and object identity, history cursor, and a
 * full AST fingerprint. Checking only a cursor is insufficient: an uncommitted
 * edit could retain the cursor while changing the mathematics. Keeping the
 * fingerprint here also protects future multiple-window integrations.
 *
 * Confirmation consumes the proposal BEFORE calling commit. This prevents a
 * double click, reentrant callback, or thrown persistence error from applying
 * one mathematical intention twice. Callers own UI cleanup in every outcome.
 */
export function createTransformationCommitLifecycle() {
  let pending = null;
  const sameStamp = (a, b) => Boolean(a && b &&
    a.documentId === b.documentId &&
    a.objectId === b.objectId &&
    a.revision === b.revision &&
    a.rootId === b.rootId &&
    a.fingerprint === b.fingerprint);

  return Object.freeze({
    open(proposal, sourceStamp) {
      if (pending || !proposal?.result?.root || !sourceStamp ||
          typeof sourceStamp.fingerprint !== 'string') return false;
      // The stamp is a defensive copy; external UI state cannot rewrite it.
      pending = { proposal, stamp: Object.freeze({ ...sourceStamp }) };
      return true;
    },
    isOpen() { return pending !== null; },
    get() { return pending?.proposal ?? null; },
    cancel() { pending = null; },
    confirm(currentStamp, commit) {
      if (!pending) return { status: 'absent' };
      const selected = pending;
      pending = null;
      if (!sameStamp(selected.stamp, currentStamp)) return { status: 'stale' };
      if (typeof commit !== 'function') return { status: 'invalid-commit' };
      // A failed commit must be reported to the caller, never silently retried.
      // The application is responsible for ensuring its commit callback is
      // atomic with respect to the Mathematical Object and history.
      commit(selected.proposal);
      return { status: 'committed' };
    }
  });
}
