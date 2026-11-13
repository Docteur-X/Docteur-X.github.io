import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocumentHistory, appendHistoryState } from '../../js/documents/documentHistory.js';
import { parseExpression } from '../helpers/legacyRootParser.js';
import { newDocument, addObject, captureDocument, activateObject } from '../../js/documents/workspaceDocuments.js';
import { serializeCompactDocument, deserializeCompactDocument, COMPACT_DOCUMENT_FORMAT } from '../../js/documents/documentSerialization.js';

function fixture() {
  let doc = addObject(newDocument('Branches'), 'First');
  const firstId = doc.activeObjectId;
  const a = parseExpression('a+b');
  const b = parseExpression('b+a');
  const c = parseExpression('a+b+c');
  const history = createDocumentHistory();
  const initial = appendHistoryState(history, {expression:a, substitutions:{}}, {actionLabel:'Start'});
  appendHistoryState(history, {expression:b, substitutions:{}}, {actionLabel:'Reorder'});
  history.currentNodeId = initial.id;
  appendHistoryState(history, {expression:c, substitutions:{x:3}}, {actionLabel:'Branch'});
  doc = captureDocument(doc, c, history, {x:3});
  doc = addObject(doc, 'Second');
  const secondId = doc.activeObjectId;
  const d = parseExpression('x*y');
  const other = createDocumentHistory();
  appendHistoryState(other, {expression:d, substitutions:{}}, {actionLabel:'Start'});
  doc = captureDocument(doc, d, other, {});
  doc = activateObject(doc, firstId);
  return {doc, firstId, secondId};
}

test('compact document round-trips two independent histories including branches and cursor', () => {
  const {doc, firstId, secondId} = fixture();
  const original = structuredClone(doc);
  const payload = serializeCompactDocument(doc);
  assert.equal(payload.format, COMPACT_DOCUMENT_FORMAT);
  assert.deepEqual(doc, original);
  for (const id of [firstId, secondId]) {
    assert.ok(payload.document.objects[id].history.nodes.every(n => !Object.hasOwn(n, 'snapshot')));
  }
  assert.deepEqual(deserializeCompactDocument(JSON.parse(JSON.stringify(payload))), doc);
});

test('compact serializer preserves valid empty documents and empty objects', () => {
  const empty = newDocument();
  assert.deepEqual(deserializeCompactDocument(serializeCompactDocument(empty)), empty);
  const withEmptyObject = addObject(empty);
  assert.deepEqual(deserializeCompactDocument(serializeCompactDocument(withEmptyObject)), withEmptyObject);
});

test('legacy full snapshot documents remain readable without rewriting the input', () => {
  const {doc} = fixture();
  assert.deepEqual(deserializeCompactDocument(doc), doc);
});

test('unknown formats and corrupt compact events fail without mutating inputs', () => {
  const {doc} = fixture();
  const payload = serializeCompactDocument(doc);
  const badVersion = structuredClone(payload);
  badVersion.formatVersion = 999;
  assert.throws(() => deserializeCompactDocument(badVersion), /Unsupported compact/);
  const badPatch = structuredClone(payload);
  badPatch.document.objects[doc.activeObjectId].history.nodes[0].event.patch[0].value.expression.type = 'Bogus';
  const original = structuredClone(badPatch);
  assert.throws(() => deserializeCompactDocument(badPatch), /replay|fingerprint|AST/);
  assert.deepEqual(badPatch, original);
});

test('reject inconsistent live documents and non-JSON data at adapter boundary', () => {
  const {doc} = fixture();
  const stale = structuredClone(doc);
  stale.objects[stale.activeObjectId].root = parseExpression('z');
  assert.throws(() => serializeCompactDocument(stale), /cursor/);
  const invalid = structuredClone(doc);
  invalid.metadata.bad = undefined;
  assert.throws(() => serializeCompactDocument(invalid), /JSON/);
});
