import test from 'node:test';
import assert from 'node:assert/strict';
import { decideOrdinaryDragDrop } from '../../../js/view/drag/ordinaryDragDropDecision.js';
const base = () => ({ commit: true, moved: true, drag: { item: { id: 'a' } },
  target: { kind: 'insert' }, sourceValid: true, modalBlocked: false,
  validate: () => true, arbitrate: ({ validate }) => ({ status: validate() ? 'chosen' : 'rejected' }) });
test('valid live arbitration can select an action', () => {
  assert.equal(decideOrdinaryDragDrop(base()).status, 'chosen');
});
test('clicks and cancellations do not consult mathematical rules', () => {
  const args = { ...base(), arbitrate: () => { throw Error('must not run'); } };
  assert.equal(decideOrdinaryDragDrop({ ...args, commit: false }).status, 'not-required');
  assert.equal(decideOrdinaryDragDrop({ ...args, moved: false }).status, 'not-required');
});
test('stale or modal-blocked drags cannot invoke arbitration', () => {
  const args = { ...base(), arbitrate: () => { throw Error('must not run'); } };
  assert.equal(decideOrdinaryDragDrop({ ...args, sourceValid: false }).status, 'blocked');
  assert.equal(decideOrdinaryDragDrop({ ...args, modalBlocked: true }).status, 'blocked');
});
test('invalid arbitration responses and thrown errors fail closed', () => {
  assert.equal(decideOrdinaryDragDrop({ ...base(), arbitrate: () => ({ status: 'surprise' }) }).status, 'blocked');
  assert.equal(decideOrdinaryDragDrop({ ...base(), arbitrate: () => { throw Error('failure'); } }).status, 'blocked');
});
