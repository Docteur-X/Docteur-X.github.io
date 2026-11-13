import test from 'node:test';
import assert from 'node:assert/strict';
import { insertionBoundary, resolveDragInsertionBoundary } from '../../../js/view/drag/insertionBoundary.js';

const a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' };
const parent = { id: 'sum', type: 'Add', operands: [a,b,c] };
const root = { id: 'root' };
const findNodeById = (_root, id) => id === 'sum' ? parent : null;
const resolve = (overrides = {}) => resolveDragInsertionBoundary({ root, parentId: 'sum', sourceId: 'b', target: { kind: 'insert', index: 2 }, findNodeById, ...overrides });

test('insertion boundary is an immutable mathematical address, not an AST occurrence', () => {
  assert.deepEqual(insertionBoundary({ parentId: 'sum', index: 0 }), { kind: 'insertion-boundary', parentId: 'sum', index: 0 });
  assert.equal(Object.isFrozen(insertionBoundary({ parentId: 'sum', index: 0 })), true);
  assert.equal(insertionBoundary({ parentId: 'sum', index: -1 }), null);
  assert.equal(insertionBoundary({ parentId: 'sum', index: 1.5 }), null);
});

test('geometry insertion indices resolve to stable semantic boundaries', () => {
  assert.deepEqual(resolve(), { kind: 'insertion-boundary', parentId: 'sum', index: 2 });
  assert.deepEqual(resolve({ target: { kind: 'insert', index: 0 } }), { kind: 'insertion-boundary', parentId: 'sum', index: 0 });
});

test('rejects missing source, wrong parent, invalid slots and non-insertion targets', () => {
  assert.equal(resolve({ sourceId: 'missing' }), null);
  assert.equal(resolve({ parentId: 'missing' }), null);
  assert.equal(resolve({ target: { kind: 'combine', id: 'a' } }), null);
  assert.equal(resolve({ target: { kind: 'insert', index: 3 } }), null);
  assert.equal(resolve({ target: { kind: 'insert', index: -1 } }), null);
  assert.equal(resolve({ target: { kind: 'insert', index: 0.5 } }), null);
  assert.equal(resolve({ findNodeById: () => ({ ...parent, type: 'Power' }) }), null);
});

test('does not claim mathematical eligibility for noncommutative products', () => {
  const product = { ...parent, type: 'Multiply' };
  assert.deepEqual(resolve({ findNodeById: () => product }), { kind: 'insertion-boundary', parentId: 'sum', index: 2 });
  // This structural descriptor is NOT permission to rearrange a product.
  // The existing mathematical rule must still approve the action.
});
