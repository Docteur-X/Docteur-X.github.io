/** Clipboard contract tests: copy is not algebra, paste creates new occurrences. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../helpers/legacyRootParser.js';
import { walkExpression } from '../../js/engine/treeUtils.js';
import { captureMathematicalClipboard, pasteMathematicalClipboard } from '../../js/documents/mathematicalClipboard.js';
import { addObject, addObjectFromClipboard, newDocument } from '../../js/documents/workspaceDocuments.js';
import { assertDocumentInvariants } from '../../js/documents/documentInvariants.js';
import { serializeCompactDocument, deserializeCompactDocument } from '../../js/documents/documentSerialization.js';

const ids = root => { const result = []; walkExpression(root, node => result.push(node.id)); return result; };

test('clipboard captures an exact subexpression independently of later source edits', () => {
  const source = parseExpression('a+(b*c)');
  const child = source.operands[1];
  const clip = captureMathematicalClipboard(source, child.id, {objectId:'object-source'});
  const original = JSON.stringify(clip);
  child.operand.operands[0].name = 'changed';
  assert.equal(JSON.stringify(clip), original);
  assert.equal(clip.root.type, 'Group');
  assert.equal(clip.source.nodeId, child.id);
  assert.equal(clip.source.objectId, 'object-source');
  assert.equal(pasteMathematicalClipboard(clip).type, 'Group');
});

test('every paste generates unique occurrence IDs while retaining mathematical structure', () => {
  const source = parseExpression('x+y=z');
  const clip = captureMathematicalClipboard(source, null);
  const first = pasteMathematicalClipboard(clip), second = pasteMathematicalClipboard(clip);
  assert.equal(first.type, 'Equal');
  assert.deepEqual(ids(first).length, ids(source).length);
  const all = [...ids(source), ...ids(first), ...ids(second)];
  assert.equal(new Set(all).size, all.length);
  const stripIds = root => JSON.parse(JSON.stringify(root, (key, value) => key === 'id' ? undefined : value));
  assert.deepEqual(stripIds(first), stripIds(source));
  assert.deepEqual(stripIds(second), stripIds(source));
});

test('pasted object has an independent, replayable initial history and compact round trip', () => {
  const source = parseExpression('x+2');
  const clip = captureMathematicalClipboard(source, source.id, {objectId:'origin'});
  const base = addObject(newDocument('Worksheet'), 'Original');
  const doc = addObjectFromClipboard(base, pasteMathematicalClipboard(clip), clip.source);
  assert.equal(base.objectOrder.length, 1);
  assert.equal(doc.objectOrder.length, 2);
  const pasted = doc.objects[doc.activeObjectId];
  assert.equal(pasted.history.nodes.length, 1);
  assert.equal(pasted.history.nodes[0].event.kind, 'context-edit');
  assert.equal(pasted.metadata.copySource.objectId, 'origin');
  assertDocumentInvariants(doc);
  assertDocumentInvariants(deserializeCompactDocument(serializeCompactDocument(doc)));
});

test('invalid or missing node selections fail rather than silently copying something else', () => {
  const source = parseExpression('a+b');
  assert.throws(() => captureMathematicalClipboard(source, 'missing'));
  assert.throws(() => captureMathematicalClipboard(null, null));
  assert.throws(() => pasteMathematicalClipboard({version:2}));
});
