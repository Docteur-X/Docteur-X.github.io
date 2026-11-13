import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../../../js/engine/parser.js';
import { mapMathematicalOccurrences } from '../../../js/view/rendering/semanticContainerMap.js';

test('semantic map preserves full AST ancestry without an artificial Add root', () => {
  // The parser returns the outermost explicit Group as the true root.
  const root = parseExpression('((3))');
  assert.equal(root.type, 'Group');
  const entries = mapMathematicalOccurrences(root);
  assert.deepEqual(entries.map(entry => entry.type), ['Group', 'Group', 'Number']);
  assert.equal(entries[0].parentId, null);
  for (let i = 1; i < entries.length; i += 1) {
    assert.equal(entries[i].parentId, entries[i - 1].nodeId);
    assert.equal(entries[i].depth, i);
  }
});

test('semantic map of a selected Group subtree starts at that Group', () => {
  // A subtree view should have local ancestry rooted at the selected node.
  // It must preserve the existing IDs, not invent replacement occurrences.
  const root = parseExpression('((3))');
  const outerGroup = root;
  const entries = mapMathematicalOccurrences(outerGroup);
  assert.deepEqual(entries.map(entry => entry.type), ['Group', 'Group', 'Number']);
  assert.equal(entries[0].nodeId, outerGroup.id);
  assert.equal(entries[0].parentId, null);
  assert.equal(entries[0].depth, 0);
  assert.equal(entries[1].parentId, entries[0].nodeId);
  assert.equal(entries[2].parentId, entries[1].nodeId);
  assert.deepEqual(entries.map(entry => entry.nodeId),
    mapMathematicalOccurrences(root).map(entry => entry.nodeId));
});

test('semantic map exposes n-ary addition root even without a direct hitbox', () => {
  const root = parseExpression('a+b+c');
  const entries = mapMathematicalOccurrences(root);
  assert.equal(entries[0].type, 'Add');
  assert.equal(entries.filter(entry => entry.type === 'Symbol').length, 3);
  assert.equal(new Set(entries.map(entry => entry.nodeId)).size, entries.length);
});

test('semantic map rejects repeated IDs instead of inventing identities', () => {
  const shared = { id: 'shared', type: 'Symbol', name: 'a' };
  assert.throws(() => mapMathematicalOccurrences({ id: 'sum', type: 'Add', operands: [shared, shared] }), /Repeated occurrence ID/);
});
