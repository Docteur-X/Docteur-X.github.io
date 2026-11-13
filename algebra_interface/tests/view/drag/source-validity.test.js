import test from 'node:test';
import assert from 'node:assert/strict';
import { isOrdinaryDragSourceCurrent } from '../../../js/view/drag/ordinaryDragSourceValidity.js';
const stamp = Object.freeze({ documentId: 'd', objectId: 'o', revision: 3, rootId: 'r', fingerprint: 'abc' });
const root = { id: 'r' };
const parent = { id: 'p', operands: [{ id: 'a' }, { id: 'b' }] };
const findNodeById = (_, id) => id === 'p' ? parent : null;
const drag = () => ({ item: { id: 'b' }, parentId: 'p', startIndex: 1, arbitrationSourceStamp: stamp });
const check = (overrides = {}) => isOrdinaryDragSourceCurrent({ drag: drag(), currentStamp: stamp, root, findNodeById, ...overrides });
test('accepts an unchanged source and original operand position', () => assert.equal(check(), true));
test('rejects changed revision, fingerprint, document or object', () => {
  for (const key of Object.keys(stamp)) {
    assert.equal(check({ currentStamp: { ...stamp, [key]: 'changed' } }), false, key);
  }
});
test('rejects moved or missing source operand', () => {
  assert.equal(check({ drag: { ...drag(), startIndex: 0 } }), false);
  assert.equal(check({ findNodeById: () => null }), false);
});
test('rejects incomplete or malformed source metadata', () => {
  assert.equal(check({ drag: { ...drag(), arbitrationSourceStamp: null } }), false);
  assert.equal(check({ drag: { ...drag(), startIndex: -1 } }), false);
  assert.equal(check({ findNodeById: null }), false);
});
