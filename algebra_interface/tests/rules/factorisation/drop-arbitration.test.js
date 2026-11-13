import test from 'node:test';
import assert from 'node:assert/strict';
import { arbitrateIntents } from '../../../js/view/drag/intentArbitration.js';
import { arbitrateFactorDrop } from '../../../js/rules/factorisation/dropArbitration.js';

const drag = Object.freeze({ sourceId: 'factor-1', moved: true,
  arbitrationViewId: 'view-a', arbitrationObjectId: 'object-a',
  arbitrationSessionToken: 'factor-session-1' });
const decide = (options = {}) => arbitrateFactorDrop({
  arbitrateIntents, drag, inZone: true, sourceValid: true,
  validate: () => true, ...options
});

test('eligible extraction zone selects only factorisation in the correct session', () => {
  const result = decide();
  assert.equal(result.status, 'chosen');
  assert.equal(result.proposal.kind, 'factorise');
  assert.equal(result.proposal.sourceOccurrenceId, 'factor-1');
  assert.equal(result.proposal.viewId, 'view-a');
  assert.equal(result.proposal.objectId, 'object-a');
});
test('outside-zone and unmoved factor releases never invoke mathematical validation', () => {
  for (const options of [{ inZone: false }, { drag: { ...drag, moved: false } }]) {
    let calls = 0;
    const outcome = decide({ ...options, validate: () => { calls++; return true; } });
    assert.notEqual(outcome.status, 'chosen');
    assert.equal(calls, 0);
  }
});
test('stale and modal-blocked factor releases fail closed before rule checks', () => {
  for (const options of [{ sourceValid: false }, { modalBlocked: true }]) {
    let calls = 0;
    const outcome = decide({ ...options, validate: () => { calls++; return true; } });
    assert.equal(outcome.status, 'blocked');
    assert.equal(calls, 0);
  }
});
test('malformed sessions do not invoke mathematical rules', () => {
  for (const bad of [null, {}, { ...drag, sourceId: '' }, { ...drag, sourceId: 4 }]) {
    let calls = 0;
    assert.notEqual(decide({ drag: bad, validate: () => { calls++; return true; } }).status, 'chosen');
    assert.equal(calls, 0);
  }
});
test('only explicit true eligibility permits a factorisation proposal', () => {
  for (const value of [false, null, 1, 'true', undefined]) {
    assert.equal(decide({ validate: () => value }).status, 'none');
  }
  assert.equal(decide({ validate: () => { throw Error('stale'); } }).status, 'none');
});
test('view, object, and session mismatches cannot authorize extraction', () => {
  for (const field of ['arbitrationViewId', 'arbitrationObjectId', 'arbitrationSessionToken']) {
    const outcome = decide({ drag: { ...drag, [field]: '' } });
    assert.equal(outcome.status, 'blocked');
  }
});
