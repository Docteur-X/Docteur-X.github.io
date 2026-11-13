import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSymbol, createNodeId, reserveNodeIds } from '../../js/engine/nodeFactory.js';
import { newDocument, addObject, reserveDocumentNodeIds } from '../../js/documents/workspaceDocuments.js';
import { deserializeCompactDocument, serializeCompactDocument } from '../../js/documents/documentSerialization.js';

const fixture = name => JSON.parse(readFileSync(new URL(`../../e2e/fixtures/${name}`, import.meta.url), 'utf8'));

test('restored function-call argument IDs are reserved before future node allocation', () => {
  const future = 900000;
  reserveNodeIds({ id: 'node-1', type: 'Apply', operator: 'f', arguments: [
    { id: `node-${future}`, type: 'Symbol', name: 'x' }
  ] });
  assert.ok(Number(createNodeId().slice(5)) > future);
});

test('document reservation covers every historical branch and future function arguments', () => {
  const doc = addObject(newDocument('Identity restoration'));
  const obj = doc.objects[doc.activeObjectId];
  obj.root = { id: 'node-2', type: 'Apply', operator: 'f', arguments: [
    { id: 'node-950000', type: 'Symbol', name: 'x' }
  ] };
  reserveDocumentNodeIds(doc);
  assert.ok(Number(createSymbol('y').id.slice(5)) > 950000);
});

test('empty document and uncommitted empty object survive compact round trip', () => {
  for (const doc of [newDocument('Empty'), addObject(newDocument('Draft'))]) {
    const compact = serializeCompactDocument(doc);
    assert.deepEqual(deserializeCompactDocument(compact), doc);
  }
});

test('historical fixtures still deserialize and reserialize after release changes', () => {
  const legacy = deserializeCompactDocument(fixture('legacy-v1.json'));
  assert.equal(legacy.schemaVersion, 2);
  const branch = fixture('multi-object-branching.json');
  assert.deepEqual(serializeCompactDocument(deserializeCompactDocument(branch)), branch);
});
