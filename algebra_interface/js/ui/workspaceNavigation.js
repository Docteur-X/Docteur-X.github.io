/** Render workspace/document navigation without owning mathematical state.
 * Controllers pass committed documents and selection; this module only updates DOM. */
export function renderWorkspaceNavigation(dom, documents, activeId, dirty, activeDocument) {
  dom.workspaceList.replaceChildren();
  for (const doc of documents.values()) {
    const button = dom.workspaceList.ownerDocument.createElement('button');
    button.type = 'button';
    button.className = 'workspace-document';
    button.dataset.documentId = doc.id;
    button.setAttribute('aria-current', String(doc.id === activeId));
    button.textContent = `${doc.title}${dirty.has(doc.id) ? ' •' : ''}`;
    dom.workspaceList.append(button);
  }
  const active = Boolean(activeDocument);
  dom.workspaceEditor.hidden = !active;
  dom.workspaceEmpty.hidden = active;
  for (const button of [dom.workspaceSave, dom.workspaceRename, dom.workspaceDuplicate,
    dom.workspaceClose, dom.workspaceDelete, dom.workspaceExport]) button.disabled = !active;
  dom.workspaceName.textContent = activeDocument?.title || 'No document selected';
  renderObjectNavigation(dom, activeDocument);
}

/** Object tabs are UI affordances, not nodes in the mathematical AST. */
export function renderObjectNavigation(dom, doc) {
  dom.objectList.replaceChildren();
  if (!doc) {
    dom.objectRename.disabled = dom.objectDelete.disabled = true;
    return;
  }
  for (const objectId of doc.objectOrder) {
    const object = doc.objects[objectId];
    const button = dom.objectList.ownerDocument.createElement('button');
    button.type = 'button';
    button.className = 'workspace-document';
    button.dataset.objectId = objectId;
    button.setAttribute('aria-current', String(objectId === doc.activeObjectId));
    button.textContent = object.title;
    dom.objectList.append(button);
  }
  dom.objectRename.disabled = dom.objectDelete.disabled = !doc.activeObjectId;
}
