import test from 'node:test';
import assert from 'node:assert/strict';
import { arbitrateIntents } from '../../../js/view/drag/intentArbitration.js';
import { arbitrateIdentityDrop } from '../../../js/rules/identity-element/dropArbitration.js';

const drag = Object.freeze({ operation: 'Add', pointerId: 3,
  arbitrationViewId: 'view-a', arbitrationObjectId: 'object-a',
  arbitrationSessionToken: 'identity-1' });
const decide = (changes = {}) => arbitrateIdentityDrop({
  arbitrateIntents, drag, sourceValid: true, actionValid: true, ...changes
});

test('eligible identity release selects the identity intent in its own view', () => {
  const result = decide();
  assert.equal(result.status, 'chosen');
  assert.equal(result.proposal.kind, 'identity');
  assert.equal(result.proposal.viewId, 'view-a');
  assert.equal(result.proposal.objectId, 'object-a');
});
test('both additive and multiplicative identity gestures are recognized', () => {
  assert.equal(decide({ drag: { ...drag, operation: 'Multiply' } }).status, 'chosen');
});
test('outside-target release does not authorize preview', () => {
  assert.equal(decide({ actionValid: false }).status, 'none');
});
test('stale and modal-blocked sessions fail closed', () => {
  assert.equal(decide({ sourceValid: false }).status, 'blocked');
  assert.equal(decide({ modalBlocked: true }).status, 'blocked');
});
test('invalid or cancelled gesture cannot select identity', () => {
  for (const bad of [null, {}, { ...drag, operation: 'Subtract' },
    { ...drag, pointerId: -1 }, { ...drag, pointerId: 1.5 }]) {
    assert.notEqual(decide({ drag: bad }).status, 'chosen');
  }
});
test('missing view, object or session identity fails closed', () => {
  for (const field of ['arbitrationViewId', 'arbitrationObjectId', 'arbitrationSessionToken']) {
    assert.equal(decide({ drag: { ...drag, [field]: '' } }).status, 'blocked');
  }
});
test('identity arbiter does not mutate its inputs', () => {
  const result = decide();
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.proposal), true);
  assert.equal(drag.operation, 'Add');
});
