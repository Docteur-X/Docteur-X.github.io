/**
 * Document-level compact history adapter. This is a pure, opt-in format boundary:
 * the live editor keeps snapshots, and no storage or UI behaviour changes here.
 */
import { exportEventHistory, hydrateHistorySnapshots } from './documentHistory.js';
import { validateDocument } from './workspaceDocuments.js';
import { assertDocumentInvariants } from './documentInvariants.js';

export const COMPACT_DOCUMENT_FORMAT = 'algebra-document-event-history';
const COMPACT_DOCUMENT_FORMAT_VERSION = 1;
const clone = value => JSON.parse(JSON.stringify(value));
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
import { assertBoundedJson, SERIALIZATION_LIMITS } from './serializationLimits.js';
const assertJsonData = assertBoundedJson;

/** Export every object's event graph without modifying the input document. */
export function serializeCompactDocument(document) {
  assertJsonData(document);
  const live = validateDocument(document);
  if (live.objectOrder.length > SERIALIZATION_LIMITS.maxObjects) throw new Error("Document object limit exceeded.");
  assertDocumentInvariants(live);
  const compact = clone(live);
  for (const object of Object.values(compact.objects)) {
    object.history = exportEventHistory(object.history);
  }
  return {
    format: COMPACT_DOCUMENT_FORMAT,
    formatVersion: COMPACT_DOCUMENT_FORMAT_VERSION,
    document: compact
  };
}

/**
 * Hydrate all object histories before exposing a live document. Saved-document
 * compatibility: documents saved in the older full form remain readable (old
 * fixtures in e2e/fixtures are tested); the caller chooses when to enable this adapter.
 */
export function deserializeCompactDocument(data) {
  assertJsonData(data);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid compact document payload.');
  }
  const envelope = own(data, 'format');
  if (envelope && (Object.keys(data).length !== 3 ||
      !['format','formatVersion','document'].every(key => own(data,key)))) {
    throw new Error('Unexpected compact document envelope fields.');
  }
  if (envelope && (data.format !== COMPACT_DOCUMENT_FORMAT ||
      data.formatVersion !== COMPACT_DOCUMENT_FORMAT_VERSION || !own(data, 'document'))) {
    throw new Error('Unsupported compact document format or version.');
  }
  const document = validateDocument(envelope ? data.document : data);
  if (document.objectOrder.length > SERIALIZATION_LIMITS.maxObjects) throw new Error('Document object limit exceeded.');
  if (envelope) {
    // Bound event graphs before reconstruction allocates snapshots.
    for (const object of Object.values(document.objects)) {
      if (object.history.nodes.length > SERIALIZATION_LIMITS.maxHistoryNodes) throw new Error('History size limit exceeded.');
      for (const node of object.history.nodes) {
        if (!node.event || !Array.isArray(node.event.patch) ||
            node.event.patch.length > SERIALIZATION_LIMITS.maxPatchOperations)
          throw new Error('History patch size limit exceeded.');
      }
    }
    for (const object of Object.values(document.objects)) {
      if (object.history.nodes.some(node => own(node, 'snapshot'))) {
        throw new Error('Compact histories must not contain cached snapshots.');
      }
      object.history = hydrateHistorySnapshots(object.history);
    }
  }
  assertDocumentInvariants(document);
  return document;
}
