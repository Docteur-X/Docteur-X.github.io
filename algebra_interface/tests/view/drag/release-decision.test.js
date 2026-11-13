import test from 'node:test';
import assert from 'node:assert/strict';
import { decideOrdinaryDragRelease } from '../../../js/view/drag/ordinaryDragReleaseDecision.js';

test('equation release is allowed regardless of target kind', () => {
  assert.deepEqual(decideOrdinaryDragRelease({ insideEquation: true, insidePreview: false, targetKind: 'none' }),
    { allowed: true, reason: 'equation' });
});
test('insertion preview allows an otherwise outside release', () => {
  assert.deepEqual(decideOrdinaryDragRelease({ insideEquation: false, insidePreview: true, targetKind: 'insert' }),
    { allowed: true, reason: 'insertion-preview' });
});
test('non-insertion preview cannot authorize an outside release', () => {
  for (const kind of ['none', 'combine', 'distribution']) {
    assert.equal(decideOrdinaryDragRelease({ insideEquation: false, insidePreview: true, targetKind: kind }).allowed, false);
  }
});
test('malformed release measurements fail closed', () => {
  assert.throws(() => decideOrdinaryDragRelease({ insideEquation: 1, insidePreview: false, targetKind: 'insert' }), TypeError);
  assert.throws(() => decideOrdinaryDragRelease({ insideEquation: false, insidePreview: false }), TypeError);
});
