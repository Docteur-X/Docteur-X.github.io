/** One document's committed mathematical state and branch-aware history.
 * The UI may replace the active controller without changing algebra modules.
 */
import { captureDocument, validateDocument } from './workspaceDocuments.js';
export function createDocumentController(initial) {
  let document = validateDocument(initial);
  return {
    get document() { return document; },
    commit(root, history, substitutions) {
      document = captureDocument(document, root, history, substitutions);
      return document;
    },
    rename(title) {
      document = { ...document, title: title.trim(), metadata: {
        ...document.metadata, updatedAt: new Date().toISOString()
      }};
      return document;
    }
  };
}
