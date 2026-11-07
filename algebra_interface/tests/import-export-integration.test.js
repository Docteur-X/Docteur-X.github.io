import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newDocument, addObject } from '../js/core/workspaceDocuments.js';
import { serializeCompactDocument, deserializeCompactDocument } from '../js/core/documentSerialization.js';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('workspace file controls use compact export and validated hydration', () => {
  assert.match(source, /const payload = serializeCompactDocument\(doc\)/);
  assert.match(source, /const doc = deserializeCompactDocument\(JSON\.parse\(await file\.text\(\)\)\)/);
  const importSection = source.slice(source.indexOf('async function importWorkspaceDocument('), source.indexOf('async function loadWorkspace('));
  assert.ok(importSection.indexOf('deserializeCompactDocument(') < importSection.indexOf('await queueSave(doc)'));
  assert.ok(importSection.indexOf('await queueSave(doc)') < importSection.indexOf('workspace.documents.set(doc.id, doc)'));
  assert.ok(importSection.indexOf('workspace.documents.set(doc.id, doc)') < importSection.indexOf('activateDocument(doc.id)'));
});

test('compact and legacy import remain compatible without modifying input', () => {
  const doc = addObject(newDocument('Import contract'));
  const original = structuredClone(doc);
  assert.deepEqual(deserializeCompactDocument(serializeCompactDocument(doc)), original);
  assert.deepEqual(deserializeCompactDocument(doc), original);
  assert.deepEqual(doc, original);
});
