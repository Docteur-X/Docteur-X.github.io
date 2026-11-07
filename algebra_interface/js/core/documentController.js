/** Owns one document's collection of independently evolving mathematical objects.
 * The existing Manipulator works with the active object's AST and history only.
 */
import { captureDocument, validateDocument, addObject, activateObject,
  removeObject, renameObject, addObjectFromClipboard, getActiveObject } from './workspaceDocuments.js';
export function createDocumentController(initial) {
  let document = validateDocument(initial);
  return {
    get document() { return document; },
    get activeObject() { return getActiveObject(document); },
    commit(root, history, substitutions) {
      document = captureDocument(document, root, history, substitutions);
      return document;
    },
    addObject(title) { document = addObject(document, title); return document; },
    addObjectFromClipboard(root, source, title) {
      document = addObjectFromClipboard(document, root, source, title);
      return document;
    },
    activateObject(id) { document = activateObject(document, id); return document; },
    removeObject(id) { document = removeObject(document, id); return document; },
    renameObject(id, title) { document = renameObject(document, id, title); return document; },
    rename(title) {
      document = { ...document, title: title.trim(), metadata: {
        ...document.metadata, updatedAt: new Date().toISOString()
      }};
      return document;
    }
  };
}
