import test from 'node:test';
import assert from 'node:assert/strict';
import { sameOrdinaryDragSourceStamp as same } from '../../../js/view/drag/ordinaryDragSourceStamp.js';

test('identical source stamps are accepted without mutating either stamp', () => {
  const before = Object.freeze({ documentId: 'd', revision: 3, rootId: 'r' });
  const after = Object.freeze({ rootId: 'r', revision: 3, documentId: 'd' });
  assert.equal(same(before, after), true);
  assert.deepEqual(Object.keys(before), ['documentId', 'revision', 'rootId']);
});
test('new or missing revision fields invalidate pickup', () => {
  assert.equal(same({ revision: 1 }, { revision: 1, objectId: 'new' }), false);
  assert.equal(same({ revision: 1, objectId: 'old' }, { revision: 1 }), false);
});
test('changed primitive values invalidate pickup', () => {
  assert.equal(same({ revision: 1 }, { revision: 2 }), false);
  assert.equal(same({ revision: 1 }, { revision: '1' }), false);
});
test('malformed or object-valued stamps fail closed', () => {
  assert.equal(same(null, {}), false);
  assert.equal(same({}, {}), false);
  assert.equal(same({ revision: {} }, { revision: {} }), false);
  assert.equal(same([], []), false);
});
