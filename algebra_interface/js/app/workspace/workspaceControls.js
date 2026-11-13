/**
 * Workspace controls (stage 6): the document and object buttons, wired to
 * named actions. Prompts and confirmations are asked here; what each action
 * does to the workspace stays with its owner (app.js passes the actions).
 */
export function bindWorkspaceControls(dom, actions, {
  ask = (question, fallback) => window.prompt(question, fallback),
  confirm = question => window.confirm(question)
} = {}) {
  const on = (element, type, handler) => element.addEventListener(type, handler);

  // Mathematical objects inside the open document.
  on(dom.objectNew, 'click', () => {
    const title = ask('Name the mathematical object:', actions.nextObjectTitle());
    if (title !== null) actions.addObject(title);
  });
  on(dom.objectList, 'click', event => {
    const button = event.target.closest('[data-object-id]');
    if (button) actions.switchObject(button.dataset.objectId);
  });
  on(dom.objectRename, 'click', () => {
    const object = actions.activeObject();
    if (!object) return;
    const title = ask('Rename mathematical object:', object.title);
    if (title !== null) actions.renameObject(object.id, title);
  });
  on(dom.objectDelete, 'click', () => {
    const object = actions.activeObject();
    if (!object || !confirm(`Delete mathematical object “${object.title}”?`)) return;
    actions.removeObject(object.id);
  });

  // Documents.
  on(dom.workspaceNew, 'click', () => {
    const title = ask('Name the new mathematical document:', 'Untitled');
    if (title !== null) actions.createDocument(title);
  });
  on(dom.workspaceList, 'click', event => {
    const button = event.target.closest('[data-document-id]');
    if (button) actions.activateDocument(button.dataset.documentId);
  });
  on(dom.workspaceSave, 'click', () => actions.saveDocument());
  on(dom.workspaceRename, 'click', () => {
    const title = actions.activeDocumentTitle();
    if (title === null) return;
    const next = ask('Rename document:', title);
    if (next?.trim()) actions.renameDocument(next);
  });
  on(dom.workspaceDuplicate, 'click', () => actions.duplicateDocument());
  on(dom.workspaceClose, 'click', () => actions.closeDocument());
  on(dom.workspaceDelete, 'click', () => actions.deleteDocument());
  on(dom.workspaceExport, 'click', () => actions.exportDocument());
  on(dom.workspaceImport, 'change', event => {
    actions.importDocument(event.target.files?.[0]);
    event.target.value = '';
  });
}
