import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deserializeCompactDocument, serializeCompactDocument } from '../../js/documents/documentSerialization.js';

const fixture = name => JSON.parse(readFileSync(new URL(`../../e2e/fixtures/${name}`, import.meta.url), 'utf8'));

test('historical v1 fixture migrates without changing AST IDs or history events', () => {
  const legacy = fixture('legacy-v1.json');
  const migrated = deserializeCompactDocument(legacy);
  const object = migrated.objects[migrated.activeObjectId];
  assert.equal(migrated.schemaVersion, 2);
  assert.deepEqual(object.root, legacy.root);
  assert.deepEqual(object.history, legacy.history);
  assert.deepEqual(object.substitutions, legacy.substitutions);
  assert.deepEqual(legacy, fixture('legacy-v1.json'));
});

test('multi-object fixture preserves both branches, cursor, and identities on round trip', () => {
  const compact = fixture('multi-object-branching.json');
  const restored = deserializeCompactDocument(compact);
  const again = serializeCompactDocument(restored);
  assert.deepEqual(again, compact);
  assert.equal(restored.objectOrder.length, 2);
  const first = restored.objects[restored.objectOrder[0]].history;
  assert.equal(first.nodes.length, 3);
  assert.equal(first.nodes.filter(node => node.parentId === 1).length, 2);
  assert.equal(first.currentNodeId, 3);
});
