import { createWorkspaceStatusGate } from './workspaceStatusGate.js';

/**
 * Owns only persistence scheduling and asynchronous status eligibility.
 * The application retains authoritative document selection, dirty markers,
 * and mathematical commits. A queued write captures its document snapshot;
 * switching documents never redirects an in-flight save.
 */
export function createWorkspaceSaveCoordinator({ save, getActiveDocument, getActiveId,
  isLatestSnapshot, markSaved, refreshNavigation, showStatus, delayMs = 350,
  setTimer = setTimeout, clearTimer = clearTimeout }) {
  const statusGate = createWorkspaceStatusGate();
  let timer = null;
  let queue = Promise.resolve();

  function queueSave(document) {
    // Failed writes must not poison the queue for later documents.
    queue = queue.catch(() => {}).then(() => save(document));
    return queue;
  }
  async function saveDocument(document, statusToken = null) {
    if (!document) return;
    // Preserve the status generation captured when an autosave was scheduled.
    // Import invalidates that generation, but must not cancel the actual write.
    const token = statusToken ?? statusGate.capture(document.id);
    try {
      await queueSave(document);
      // A completed write acknowledges only the snapshot it actually stored.
      // The student may have edited the same document while this write waited.
      const stillLatest = isLatestSnapshot(document);
      if (stillLatest) markSaved(document.id);
      refreshNavigation();
      if (statusGate.isCurrent(token, getActiveId())) {
        showStatus(stillLatest
          ? `Saved ${document.title} locally.`
          : `Newer changes to ${document.title} are still unsaved.`);
      }
      return true;
    } catch (error) {
      if (statusGate.isCurrent(token, getActiveId())) {
        showStatus(`Save failed: ${error.message}. Export a JSON backup.`);
      }
      return false;
    }
  }
  function cancelPending() {
    clearTimer(timer);
    timer = null;
  }
  function scheduleSave() {
    cancelPending();
    showStatus('Unsaved changes — autosave pending.');
    // Capture the current committed snapshot NOW, not when the timer fires.
    const document = getActiveDocument();
    const statusToken = document ? statusGate.capture(document.id) : null;
    timer = setTimer(() => {
      timer = null;
      void saveDocument(document, statusToken);
    }, delayMs);
  }
  return Object.freeze({ queueSave, saveDocument, scheduleSave, cancelPending,
    invalidateStatus: () => statusGate.invalidate(),
    waitForWrites: () => queue.catch(() => {}) });
}
