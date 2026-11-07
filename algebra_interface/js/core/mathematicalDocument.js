/** A mathematical document owns a root and its history, not DOM state.
 * Stable document/state/event references leave room for future branching,
 * storage and cross-document substitution without implementing those now.
 */
import { categoryOf } from "./nodeCategories.js";
import { cloneExpression } from "./nodeFactory.js";
import { createDocumentHistory } from "./documentHistory.js";
let nextDocument = 1;
export function createMathematicalDocument(root, { title = "Untitled" } = {}) {
  const kind = categoryOf(root);
  if (!kind) throw new TypeError("Document root must be an expression or statement.");
  const now = new Date().toISOString();
  return { id: `document-${nextDocument++}`, schemaVersion: 1, title,
    kind, root: cloneExpression(root), history: createDocumentHistory(),
    metadata: { createdAt: now, updatedAt: now } };
}
export function updateDocumentRoot(doc, root) {
  const kind = categoryOf(root);
  if (!kind) throw new TypeError("Invalid mathematical document root.");
  doc.root = cloneExpression(root);
  doc.kind = kind;
  doc.metadata.updatedAt = new Date().toISOString();
  return doc;
}
