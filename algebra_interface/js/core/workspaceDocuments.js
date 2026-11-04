/** Workspace-owned documents. No DOM, persistence API or algebraic rule lives here.
 * An empty document has no mathematical root until the student builds one.
 */
import { createMathematicalDocument } from './mathematicalDocument.js';
import { cloneExpression } from './nodeFactory.js';
import { createDocumentHistory } from './documentHistory.js';

const copy = value => JSON.parse(JSON.stringify(value));
export const WORKSPACE_SCHEMA_VERSION = 1;
export function newDocument(title = 'Untitled') {
  const now = new Date().toISOString();
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    schemaVersion: WORKSPACE_SCHEMA_VERSION, title: title.trim() || 'Untitled',
    root: null, kind: null, history: createDocumentHistory(), substitutions: {},
    metadata: { createdAt: now, updatedAt: now }
  };
}
/** Take ownership of a committed editor state, never pointer/preview state. */
export function captureDocument(doc, root, history, substitutions) {
  const next = copy(doc);
  next.root = root ? cloneExpression(root) : null;
  next.kind = root?.type === 'Equal' ? 'statement' : root ? 'expression' : null;
  next.history = copy(history);
  next.substitutions = { ...substitutions };
  next.metadata.updatedAt = new Date().toISOString();
  return next;
}
/** Validate imported data before it is admitted to the active editor. */
export function validateDocument(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      value.schemaVersion !== WORKSPACE_SCHEMA_VERSION ||
      typeof value.id !== 'string' || !value.id ||
      typeof value.title !== 'string' || value.title.length > 200 ||
      !value.history || !Array.isArray(value.history.nodes) ||
      !Number.isSafeInteger(value.history.nextNodeId) ||
      !value.metadata || typeof value.metadata !== 'object' ||
      !value.substitutions || typeof value.substitutions !== 'object' || Array.isArray(value.substitutions)) {
    throw new Error('Unsupported or invalid mathematical document.');
  }
  if (value.root !== null && (!value.root || typeof value.root !== 'object' || typeof value.root.type !== 'string')) {
    throw new Error('Invalid mathematical root.');
  }
  return copy(value);
}
export function duplicateDocument(doc) {
  const result = copy(doc);
  result.id = newDocument().id;
  result.title = `${doc.title} (copy)`;
  result.metadata = { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  return result;
}
