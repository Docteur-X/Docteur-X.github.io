/**
 * View mode: the one answer to "what is this view doing right now?"
 *
 * Standard 1 of the interaction standards
 * (Developer Documentation/06_Historical_Records/Superseded_2026-11-12/Interaction_Standards_Draft.md (decisions: 00_Current/Decisions.md)).
 * Each rendered view (today: the equation) owns exactly one instance.
 *
 * A view is in exactly one mode at a time:
 *
 *   { kind: "idle" }
 *   { kind: "dragging", owner, dragId, payload }   an occurrence or factor is being dragged
 *   { kind: "preview",  owner, lease }              a proposal waits for confirm or cancel
 *
 * The standard also names "pressing", "armed" and "menu". They are added here
 * when the code that needs them moves over (stages 3 and 4), not before.
 *
 * Rules (owner decision 1.2 is strict):
 * - Anything new may start only from "idle". A drag cannot start during a
 *   preview, and a preview cannot open during a drag.
 * - Only the holder of the current mode can end it: the drag that started it
 *   (by its dragId) or the preview host that holds the lease.
 * - `invalidate()` returns the view to idle for a context switch (another
 *   object, a document change). The caller still cleans up its own UI.
 *
 * This file is DOM-free and holds no mathematics. It replaces the former flags
 * `state.drag`, `state.factorDrag`, `state.distributionPreview`,
 * `state.groupingMode`, `state.factorisationMode` and the separate modal
 * preview ownership registry.
 */
/**
 * `onChange(kind)` (optional) is called whenever the mode's kind changes, so
 * presentation can follow it, e.g. a `data-view-mode` attribute that CSS uses
 * to show ordinary hover only in an idle view.
 */
export function createViewMode(viewId, { onChange = () => {} } = {}) {
  if (typeof viewId !== 'string' || !viewId.trim()) {
    throw new TypeError('A nonempty view ID is required');
  }
  const IDLE = Object.freeze({ kind: 'idle' });
  let mode = IDLE;
  let disposed = false;
  let serial = 0;

  // Every change of mode goes through `set`, so onChange sees each kind change.
  const set = next => {
    const changed = next.kind !== mode.kind;
    mode = next;
    if (changed) onChange(mode.kind);
  };
  const toIdle = () => set(IDLE);

  // --- Previews ------------------------------------------------------------
  // The preview host (js/steps/previewSessionHost.js) works with a
  // "lease": proof that it holds the preview mode. This object keeps the exact
  // lease interface the host and its tests already use, so the host needed no
  // change. The lease and the mode are now the same thing.
  const validRequest = request => Boolean(request &&
    request.viewId === viewId &&
    typeof request.owner === 'string' && request.owner.trim() &&
    typeof request.documentId === 'string' && request.documentId.trim() &&
    typeof request.objectId === 'string' && request.objectId.trim() &&
    typeof request.sessionToken === 'string' && request.sessionToken.trim());

  const currentLease = () => (mode.kind === 'preview' ? mode.lease : null);
  const matches = lease => {
    const current = currentLease();
    return Boolean(current && lease &&
      lease.viewId === current.viewId &&
      lease.leaseId === current.leaseId &&
      lease.owner === current.owner &&
      lease.sessionToken === current.sessionToken);
  };

  const preview = Object.freeze({
    /** Opens the preview mode. Fails, changing nothing, unless the view is idle. */
    acquire(request) {
      if (disposed) return Object.freeze({ status: 'disposed' });
      if (!validRequest(request)) return Object.freeze({ status: 'invalid' });
      if (mode.kind !== 'idle') return Object.freeze({ status: 'occupied' });
      // Copy only declared primitive identity fields; never retain caller state.
      const lease = Object.freeze({
        viewId, leaseId: ++serial, owner: request.owner,
        documentId: request.documentId, objectId: request.objectId,
        sessionToken: request.sessionToken
      });
      set(Object.freeze({ kind: 'preview', owner: lease.owner, lease }));
      return Object.freeze({ status: 'acquired', lease });
    },
    /** Only the exact live lease can end the preview. Idempotent and safe. */
    release(lease) {
      if (!matches(lease)) return false;
      toIdle();
      return true;
    },
    owns(lease) { return matches(lease); },
    /** The current preview lease, or null. Read-only identity, never a proposal. */
    active() { return currentLease(); },
    invalidate() { if (mode.kind === 'preview') toIdle(); },
    dispose() { api.dispose(); },
    isDisposed() { return disposed; }
  });

  // --- Drags ---------------------------------------------------------------
  const api = Object.freeze({
    viewId,
    preview,

    /** The current mode, frozen. Never mutate it; use the methods below. */
    current() { return mode; },
    /** True when nothing is happening, so a new action may start. */
    isIdle() { return mode.kind === 'idle'; },
    /** True when a preview is open; with `owner`, only that feature's preview. */
    isPreview(owner) {
      return mode.kind === 'preview' && (owner === undefined || mode.owner === owner);
    },
    /** True when a drag is in progress; with `owner`, only that kind of drag. */
    isDragging(owner) {
      return mode.kind === 'dragging' && (owner === undefined || mode.owner === owner);
    },

    /**
     * Start a drag. Returns a dragId (needed to end it) or null when the view
     * is not idle. `payload` is the feature's own drag record (ghost, session).
     */
    beginDrag(owner, payload) {
      if (disposed || mode.kind !== 'idle' || typeof owner !== 'string' || !owner) return null;
      const dragId = ++serial;
      set(Object.freeze({ kind: 'dragging', owner, dragId, payload }));
      return dragId;
    },
    /** The payload of the current drag of that owner, or null. */
    drag(owner) {
      return mode.kind === 'dragging' && mode.owner === owner ? mode.payload : null;
    },
    /**
     * Replace the current drag's payload (the drag record is immutable data
     * for some owners). Only the drag that holds the mode may do this.
     */
    updateDrag(dragId, payload) {
      if (mode.kind !== 'dragging' || mode.dragId !== dragId) return false;
      set(Object.freeze({ ...mode, payload }));
      return true;
    },
    /** End the drag. Only the dragId that started it can. Idempotent. */
    endDrag(dragId) {
      if (mode.kind !== 'dragging' || mode.dragId !== dragId) return false;
      toIdle();
      return true;
    },
    /** The dragId of the current drag of that owner, or null. */
    dragId(owner) {
      return mode.kind === 'dragging' && mode.owner === owner ? mode.dragId : null;
    },

    /** Context switch: return to idle. Callers clean their own presentation. */
    invalidate() { toIdle(); },
    /** View teardown: nothing can start afterwards. */
    dispose() { toIdle(); disposed = true; },
    isDisposed() { return disposed; }
  });
  return api;
}
