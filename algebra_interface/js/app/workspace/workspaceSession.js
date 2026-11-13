/**
 * Workspace session (stage 6): the documents in this browser, which one is
 * open, which object of it is shown, and saving, importing and exporting.
 *
 * WHY: before stage 6 this was about 370 lines in the middle of app.js, mixed
 * with the equation view. It owns DOCUMENT state only. Whatever the equation
 * view must do around a change (dismiss previews, cancel drags, clear the
 * selection, re-render) is asked through the `view` hooks, so this module
 * never touches the view, a rule or a preview directly:
 *   view.dismissPreviews()    true when no preview is left open
 *   view.cancelInteraction()  dismiss previews and drags; false if refused
 *   view.beforeObjectLoad(), view.afterObjectLoad()
 *   view.setStatus(text), view.confirm(question)
 *
 * The workspace buttons are wired in ./workspaceControls.js.
 */
import { createWorkspaceSaveCoordinator } from './workspaceSaveCoordinator.js';
import { isDeletionContextCurrent } from './workspaceDeletionGuard.js';
import { renderWorkspaceNavigation, renderObjectNavigation } from '../ui/workspaceNavigation.js';
import { reserveNodeIds } from '../../engine/nodeFactory.js';
import { createDocumentController } from '../../documents/documentController.js';
import { createObjectWorkingState } from '../../documents/objectWorkingState.js';
import { newDocument, addObject, duplicateDocument, reserveDocumentNodeIds } from '../../documents/workspaceDocuments.js';
import { serializeCompactDocument, deserializeCompactDocument } from '../../documents/documentSerialization.js';
import { createDocumentHistory } from '../../documents/documentHistory.js';

export function createWorkspaceSession({ dom, documentState, documentRepository, view }) {
  const workspace = { documents: new Map(), activeId: null, controller: null,
    openIds: new Set(), dirty: new Set() };

  function workspaceMessage(message) { dom.workspaceStatus.textContent = message; }
  function activeDocument() { return workspace.controller?.document ?? null; }
  function updateWorkspaceUI() {
    renderWorkspaceNavigation(dom, workspace.documents, workspace.activeId,
      workspace.dirty, activeDocument());
  }
  function renderObjectList() { renderObjectNavigation(dom, activeDocument()); }
  // Rebind the single equation view to one object's committed state.
  function loadActiveObject() {
    // The view restores any candidate DOM against its original tree before
    // the active object and its expression root are replaced.
    view.beforeObjectLoad();
    const object = workspace.controller?.activeObject ?? null;
    if (object) {
      reserveNodeIds(object.root);
      object.history.nodes.forEach(node => reserveNodeIds(node.snapshot?.expression));
    }
    // Never edit history or nested substitutions reachable from a committed
    // document snapshot: queued saves rely on snapshot identity.
    const working = createObjectWorkingState(object);
    documentState.expressionRoot = working.expressionRoot;
    documentState.history = working.history;
    documentState.substitutions = working.substitutions;
    view.afterObjectLoad();
    renderObjectList();
  }
  function switchObject(id) {
    if (!workspace.controller || activeDocument().activeObjectId === id) return;
    if (!view.cancelInteraction()) return;
    workspace.controller.activateObject(id);
    workspace.documents.set(workspace.activeId, activeDocument());
    loadActiveObject();
    updateWorkspaceUI();
    view.setStatus('Mathematical object opened.');
  }
  function changeObject(operation) {
    if (!workspace.controller) return;
    if (!view.cancelInteraction()) return;
    operation(workspace.controller);
    workspace.documents.set(workspace.activeId, activeDocument());
    workspace.dirty.add(workspace.activeId);
    loadActiveObject();
    updateWorkspaceUI();
    scheduleSave();
  }

  // Capture only committed state; never serialize pointer geometry or previews.
  function captureActive() {
    if (!workspace.controller) return;
    const doc = workspace.controller.commit(documentState.expressionRoot, documentState.history, documentState.substitutions);
    workspace.documents.set(doc.id, doc);
    workspace.dirty.add(doc.id);
    updateWorkspaceUI();
  }
  // Persistence sequencing and delayed status publication have one owner.
  // Workspace selection, dirty state, and mathematical commits remain here.
  const workspaceSaves = createWorkspaceSaveCoordinator({
    save: doc => documentRepository.save(doc),
    getActiveDocument: activeDocument,
    getActiveId: () => workspace.activeId,
    isLatestSnapshot: doc => workspace.documents.get(doc.id) === doc,
    markSaved: id => workspace.dirty.delete(id),
    refreshNavigation: updateWorkspaceUI,
    showStatus: workspaceMessage
  });
  const { queueSave, saveDocument, scheduleSave } = workspaceSaves;
  function activateDocument(id) {
    if (!workspace.documents.has(id)) return false;
    if (workspace.activeId === id) return true;
    // Resolve modal ownership BEFORE touching save scheduling or active state.
    // A rejected navigation must leave the existing document untouched.
    if (!view.cancelInteraction()) return false;
    workspaceSaves.cancelPending();
    // Invalidate asynchronous status messages from the previous document.
    workspaceSaves.invalidateStatus();
    if (workspace.controller && workspace.dirty.has(workspace.activeId)) {
      // Existing document is already captured after each committed change.
      void saveDocument(activeDocument());
    }
    workspace.activeId = id;
    workspace.openIds.add(id);
    workspace.controller = createDocumentController(workspace.documents.get(id));
    const doc = activeDocument();
    // All objects retain their own histories, even when not displayed.
    reserveDocumentNodeIds(doc);
    updateWorkspaceUI();
    loadActiveObject();
    view.setStatus(documentState.expressionRoot ? 'Document opened.' : 'Enter an expression or equation to begin.');
    return true;
  }
  async function createWorkspaceDocument(title) {
    // Do not create or persist an orphan document if the active preview cannot
    // safely relinquish its lease. The eventual activation checks again.
    if (!view.dismissPreviews()) return false;
    // A newly opened document starts with one empty working object. The v2
    // schema itself also permits genuinely zero-object documents.
    const doc = addObject(newDocument(title), "Object 1");
    workspace.documents.set(doc.id, doc);
    if (!activateDocument(doc.id)) {
      workspace.documents.delete(doc.id);
      return false;
    }
    workspace.dirty.add(doc.id);
    await saveDocument(doc);
    return true;
  }
  async function deleteActiveDocument() {
    const doc = activeDocument();
    if (!doc || !view.confirm(`Delete “${doc.title}” permanently from this browser?`)) return;
    if (!view.cancelInteraction()) return;
    workspaceSaves.cancelPending();
    try {
      await workspaceSaves.waitForWrites();
      // Another event may have switched documents while pending saves drained.
      // Do not delete or clear the new active document under an old confirmation.
      if (!isDeletionContextCurrent({
        requestedId: doc.id, activeId: workspace.activeId,
        currentDocumentId: activeDocument()?.id
      })) return;
      await documentRepository.remove(doc.id);
      // Storage removal is asynchronous too. If navigation happened meanwhile,
      // remove only the deleted document's bookkeeping, never the new view.
      workspace.documents.delete(doc.id);
      workspace.dirty.delete(doc.id);
      workspace.openIds.delete(doc.id);
      if (workspace.activeId !== doc.id) {
        updateWorkspaceUI();
        workspaceMessage('Document deleted.');
        return;
      }
      workspace.activeId = null;
      workspace.controller = null;
      documentState.expressionRoot = null;
      documentState.history = createDocumentHistory();
      const next = workspace.documents.keys().next().value;
      if (next) activateDocument(next);
      else updateWorkspaceUI();
      workspaceMessage('Document deleted.');
    } catch (error) { workspaceMessage(`Delete failed: ${error.message}`); }
  }
  function exportActiveDocument() {
    const doc = activeDocument();
    if (!doc) return;
    try {
      // Compact export is a boundary format; the live document retains snapshots.
      const payload = serializeCompactDocument(doc);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${doc.title.replace(/[^a-z0-9_-]+/gi, '_') || 'mathematics'}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      workspaceMessage(`Exported ${doc.title} as compact JSON.`);
    } catch (error) {
      workspaceMessage(`Export failed: ${error.message}`);
    }
  }
  async function importWorkspaceDocument(file) {
    if (!file) return;
    // An import is a new user-visible operation. Pending saves must still
    // persist, but their completion messages may no longer supersede it.
    workspaceSaves.invalidateStatus();
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('File is too large (10 MB limit).');
      // Fully validate and hydrate before touching storage or the active workspace.
      const doc = deserializeCompactDocument(JSON.parse(await file.text()));
      // A new document identity avoids replacing an existing workspace document.
      // Mathematical object and expression IDs retain their original provenance.
      doc.id = newDocument().id;
      doc.title = `${doc.title} (imported)`;
      // Parse and validate before dismissing the preview: invalid files must
      // not destroy a student's pending proposal. Recheck after asynchronous
      // persistence because the user may open a different preview meanwhile.
      if (!view.dismissPreviews()) return;
      const sourceDocumentId = workspace.activeId;
      await queueSave(doc);
      // A user may navigate while the file is being persisted. Never steal
      // focus back from a newer navigation or override its pending preview.
      if (workspace.activeId !== sourceDocumentId || !view.dismissPreviews()) {
        // The import was persisted but never made visible; remove that orphan.
        await documentRepository.remove(doc.id);
        return;
      }
      workspace.documents.set(doc.id, doc);
      if (!activateDocument(doc.id)) {
        workspace.documents.delete(doc.id);
        await documentRepository.remove(doc.id);
        return;
      }
      workspaceMessage(`Imported ${doc.title}.`);
    } catch (error) { workspaceMessage(`Import failed: ${error.message}`); }
  }
  async function loadWorkspace() {
    try {
      const docs = await documentRepository.list();
      for (const doc of docs) {
        workspace.documents.set(doc.id, doc);
        reserveDocumentNodeIds(doc);
      }
      updateWorkspaceUI();
      workspaceMessage(docs.length ? `${docs.length} saved document(s) available.` : 'Empty workspace — create a document to begin.');
    } catch (error) { workspaceMessage(`Storage unavailable: ${error.message}. You can still create and export documents.`); }
  }

  function renameDocument(title) {
    const doc = activeDocument(); if (!doc) return;
    workspace.controller.rename(title);
    workspace.documents.set(doc.id, activeDocument());
    workspace.dirty.add(doc.id);
    updateWorkspaceUI(); scheduleSave();
  }
  function duplicateActiveDocument() {
    const doc = activeDocument(); if (!doc) return;
    const duplicate = duplicateDocument(doc);
    if (!view.dismissPreviews()) return;
    workspace.documents.set(duplicate.id, duplicate);
    if (!activateDocument(duplicate.id)) {
      workspace.documents.delete(duplicate.id);
      return;
    }
    workspace.dirty.add(duplicate.id);
    void saveDocument(duplicate);
  }
  function closeActiveDocument() {
    // Closing is a durability boundary: do not hide the only open working view
    // until its latest committed snapshot has actually reached storage.
    void (async () => {
      const old = workspace.activeId;
      if (!old || !view.cancelInteraction()) return;
      workspaceSaves.cancelPending();
      const snapshot = activeDocument();
      if (workspace.dirty.has(old)) {
        const saved = await saveDocument(snapshot);
        // The user may have switched documents or edited the original while
        // storage was pending. Never close a different/newer working state.
        if (!saved || workspace.activeId !== old ||
            workspace.documents.get(old) !== snapshot || workspace.dirty.has(old)) {
          if (saved && workspace.activeId === old) {
            workspaceMessage('Document changed during save; close again to save the latest version.');
          }
          return;
        }
      }
      if (workspace.activeId !== old) return;
      workspace.openIds.delete(old);
      workspace.activeId = null; workspace.controller = null;
      documentState.expressionRoot = null;
      const next = [...workspace.openIds].find(id => workspace.documents.has(id));
      if (next) activateDocument(next); else updateWorkspaceUI();
      workspaceMessage('Document closed (not deleted).');
    })();
  }

  return Object.freeze({
    activeId: () => workspace.activeId,
    activeDocument,
    hasController: () => Boolean(workspace.controller),
    activeObject: () => workspace.controller?.activeObject ?? null,
    message: workspaceMessage,
    updateWorkspaceUI,
    captureActive, scheduleSave, saveDocument, queueSave,
    cancelPendingSaves: () => workspaceSaves.cancelPending(),
    switchObject, changeObject, activateDocument,
    createDocument: createWorkspaceDocument,
    deleteActiveDocument, exportActiveDocument, importWorkspaceDocument, loadWorkspace,
    renameDocument, duplicateActiveDocument, closeActiveDocument
  });
}
