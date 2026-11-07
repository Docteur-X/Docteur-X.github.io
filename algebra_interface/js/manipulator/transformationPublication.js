/**
 * Publish an already-prepared mathematical transition into the active view.
 *
 * This is the single in-memory publication boundary for the seven migrated
 * transformation families. Prepare the document replacement BEFORE touching
 * state: updateDocumentRoot can clone and validate, and those operations may
 * throw. If preparation fails, neither the root, history nor document changes.
 *
 * Publication itself consists only of synchronous property assignments; the
 * browser cannot observe the intermediate assignments in the same JS task.
 * Persistence, rendering and notifications deliberately remain with the app.
 * In particular, an IndexedDB save failure must not roll back valid work.
 *
 * A future multi-view design should publish through the authoritative object
 * store, then notify its views. Do not add DOM or IndexedDB dependencies here.
 */
import { updateDocumentRoot } from '../core/mathematicalDocument.js';

export function publishPreparedTransformation({ state, staged }) {
  if (!state || !staged?.root || !staged?.history) {
    throw new TypeError('A prepared root and history are required.');
  }
  // Prepare an independent document to avoid mutating the live document if
  // cloning, classification or metadata updating fails. Preserve the document
  // identity and all unrelated metadata.
  let nextDocument = null;
  if (state.mathematicalDocument) {
    nextDocument = structuredClone(state.mathematicalDocument);
    updateDocumentRoot(nextDocument, staged.root);
    nextDocument.history = staged.history;
  }
  state.expressionRoot = staged.root;
  state.history = staged.history;
  // Preserve the document object identity for existing workspace references.
  // Assigning precomputed plain fields cannot trigger mathematical validation.
  if (nextDocument) Object.assign(state.mathematicalDocument, nextDocument);
  return staged;
}
