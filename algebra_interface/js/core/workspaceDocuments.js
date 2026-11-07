/** Mathematical Document schema v2: a document contains independent mathematical
 * objects. Each object owns one AST, substitutions and a branching history.
 * This module is deliberately independent of DOM, storage and algebra rules.
 */
import { cloneExpression, reserveNodeIds } from './nodeFactory.js';
import { createDocumentHistory, appendHistoryState } from './documentHistory.js';
import { assertAstInvariants } from './documentInvariants.js';

const copy = value => JSON.parse(JSON.stringify(value));
const id = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const now = () => new Date().toISOString();
export const WORKSPACE_SCHEMA_VERSION = 2;

export function newMathematicalObject(title = 'Object') {
  return { id: id('object'), title, root: null, kind: null,
    history: createDocumentHistory(), substitutions: {},
    metadata: { createdAt: now(), updatedAt: now() } };
}
export function newDocument(title = 'Untitled') {
  const time = now();
  return { id: id('doc'), schemaVersion: WORKSPACE_SCHEMA_VERSION,
    title: title.trim() || 'Untitled', objects: {}, objectOrder: [], activeObjectId: null,
    metadata: { createdAt: time, updatedAt: time } };
}
export function getActiveObject(doc) { return doc.objects[doc.activeObjectId] ?? null; }
export function addObject(doc, title = 'Object') {
  const next = copy(doc), object = newMathematicalObject(title);
  next.objects[object.id] = object;
  next.objectOrder.push(object.id);
  next.activeObjectId = object.id;
  next.metadata.updatedAt = now();
  return next;
}
/**
 * Add a new independent object from an already freshly-IDed clipboard tree.
 * The first history event is an initial document-context state, NOT an algebra
 * proof or a transformation of the source. The source remains untouched.
 * Keep the clipboard provenance on the object (not inside the mathematical AST).
 */
export function addObjectFromClipboard(doc, root, source = null, title = 'Copied object') {
  assertAstInvariants(root);
  const next = addObject(doc, title);
  const object = getActiveObject(next);
  object.root = cloneExpression(root);
  object.kind = root.type === 'Equal' ? 'statement' : 'expression';
  object.history = createDocumentHistory();
  appendHistoryState(object.history, { expression: cloneExpression(root), substitutions: {} }, {
    actionLabel: 'Initial copied mathematical content', kind: 'context-edit'
  });
  object.metadata.copySource = source ? copy(source) : null;
  return next;
}
export function activateObject(doc, objectId) {
  if (!Object.hasOwn(doc.objects, objectId)) throw new Error('Unknown mathematical object.');
  return { ...doc, activeObjectId: objectId };
}
export function removeObject(doc, objectId) {
  if (!Object.hasOwn(doc.objects, objectId)) throw new Error('Unknown mathematical object.');
  const next = copy(doc);
  delete next.objects[objectId];
  next.objectOrder = next.objectOrder.filter(value => value !== objectId);
  if (next.activeObjectId === objectId) next.activeObjectId = next.objectOrder[0] ?? null;
  next.metadata.updatedAt = now();
  return next;
}
export function renameObject(doc, objectId, title) {
  if (!Object.hasOwn(doc.objects, objectId)) throw new Error('Unknown mathematical object.');
  const next = copy(doc);
  next.objects[objectId].title = title.trim() || 'Object';
  next.metadata.updatedAt = now();
  return next;
}
/** Update only the active object's committed state; never store drag previews. */
export function captureDocument(doc, root, history, substitutions) {
  const next = copy(doc), object = getActiveObject(next);
  if (!object) throw new Error('Document has no active mathematical object.');
  object.root = root ? cloneExpression(root) : null;
  object.kind = root?.type === 'Equal' ? 'statement' : root ? 'expression' : null;
  object.history = copy(history);
  object.substitutions = { ...substitutions };
  object.metadata.updatedAt = next.metadata.updatedAt = now();
  return next;
}
/** Import old v1 documents without changing their AST or historical node IDs. */
export function migrateDocument(value) {
  if (value?.schemaVersion !== 1) return value;
  const object = newMathematicalObject('Object 1');
  object.root = value.root ?? null;
  object.kind = value.kind ?? null;
  object.history = value.history;
  object.substitutions = value.substitutions ?? {};
  return { id: value.id, title: value.title, schemaVersion: 2,
    objects: { [object.id]: object }, objectOrder: [object.id],
    activeObjectId: object.id, metadata: value.metadata };
}
/** Structural checks before admitting imported or persisted documents. */
export function validateDocument(input) {
  const value = migrateDocument(input);
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      value.schemaVersion !== 2 || typeof value.id !== 'string' || !value.id ||
      typeof value.title !== 'string' || value.title.length > 200 ||
      !value.metadata || typeof value.metadata !== 'object' ||
      !value.objects || typeof value.objects !== 'object' || Array.isArray(value.objects) ||
      !Array.isArray(value.objectOrder) ||
      new Set(value.objectOrder).size !== value.objectOrder.length ||
      Object.keys(value.objects).length !== value.objectOrder.length ||
      (value.activeObjectId !== null && !value.objectOrder.includes(value.activeObjectId))) {
    throw new Error('Unsupported or invalid mathematical document.');
  }
  for (const objectId of value.objectOrder) {
    const object = Object.hasOwn(value.objects, objectId) ? value.objects[objectId] : null;
    if (!object || object.id !== objectId || typeof object.title !== 'string' ||
        !object.history || !Array.isArray(object.history.nodes) ||
        !Number.isSafeInteger(object.history.nextNodeId) ||
        !object.substitutions || typeof object.substitutions !== 'object' ||
        Array.isArray(object.substitutions) ||
        (object.root !== null && (!object.root || typeof object.root.type !== 'string'))) {
      throw new Error('Invalid mathematical object in document.');
    }
  }
  return copy(value);
}
export function duplicateDocument(doc) {
  const result = copy(validateDocument(doc));
  result.id = id('doc');
  result.title = `${doc.title} (copy)`;
  result.metadata = { createdAt: now(), updatedAt: now() };
  // Duplicated objects are independent, including their object-level identities.
  const replacements = new Map(result.objectOrder.map(old => [old, id('object')]));
  result.objects = Object.fromEntries(result.objectOrder.map(old => {
    const object = result.objects[old];
    object.id = replacements.get(old);
    return [object.id, object];
  }));
  result.objectOrder = result.objectOrder.map(old => replacements.get(old));
  result.activeObjectId = result.activeObjectId ? replacements.get(result.activeObjectId) : null;
  return result;
}
/** Reserve all historical node IDs before editing a restored object. */
export function reserveDocumentNodeIds(doc) {
  for (const object of Object.values(doc.objects)) {
    reserveNodeIds(object.root);
    object.history.nodes.forEach(node => reserveNodeIds(node.snapshot?.expression));
  }
}
