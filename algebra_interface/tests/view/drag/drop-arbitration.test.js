import test from 'node:test';
import assert from 'node:assert/strict';
import { arbitrateIntents } from '../../../js/view/drag/intentArbitration.js';
import { arbitrateOrdinaryDrop } from '../../../js/view/drag/ordinaryDropArbitration.js';
const drag = { item: { id: 'source' }, arbitrationViewId: 'view',
  arbitrationObjectId: 'object', arbitrationSessionToken: 'session' };
const decide = (target, options = {}) => arbitrateOrdinaryDrop({
  arbitrateIntents, drag, target, sourceValid: true,
  validate: () => true, ...options
});
test('settled numeric combination maps to the same mathematical target', () => {
  const result = decide({ kind: 'combine', id: 'n2' });
  assert.equal(result.status, 'chosen');
  assert.equal(result.proposal.targetOccurrenceId, 'n2');
  assert.equal(result.proposal.sourceOccurrenceId, 'source');
});
test('distribution and negation compression retain their own intent kinds', () => {
  for (const kind of ['distribution', 'negation-compress']) {
    assert.equal(decide({ kind, id: 'n2' }).proposal.kind, kind);
  }
});
test('settled insertion maps its index without synthesizing a target node', () => {
  const result = decide({ kind: 'insert', index: 2 });
  assert.equal(result.status, 'chosen');
  assert.equal(result.proposal.insertionIndex, 2);
  assert.equal(result.proposal.targetOccurrenceId, undefined);
});
test('invalid or missing targets never call mathematical validation', () => {
  for (const target of [{ kind: 'invalid' }, { kind: 'none' }, null]) {
    const result = decide(target, { validate: () => { throw Error('must not run'); } });
    assert.equal(result.status, 'none');
  }
});
test('ineligible mathematical rules cannot be selected', () => {
  assert.equal(decide({ kind: 'combine', id: 'n2' }, { validate: () => false }).status, 'none');
});
test('stale source and modal ownership block before validation', () => {
  for (const options of [{ sourceValid: false }, { modalBlocked: true }]) {
    const result = decide({ kind: 'combine', id: 'n2' }, {
      ...options, validate: () => { throw Error('must not run'); }
    });
    assert.equal(result.status, 'blocked');
  }
});
test('view, object, and gesture session identities are preserved', () => {
  const result = decide({ kind: 'combine', id: 'n2' });
  assert.equal(result.proposal.viewId, drag.arbitrationViewId);
  assert.equal(result.proposal.objectId, drag.arbitrationObjectId);
  assert.equal(result.sessionToken, drag.arbitrationSessionToken);
});

// Phase 3C hardening: malformed gesture data must never invoke a rule adapter.
test('malformed drag sessions fail closed without calling validation', () => {
  for (const badDrag of [null, {}, { item: null }, { item: {} },
    { item: { id: 3 } }, { item: { id: '' } }]) {
    let calls = 0;
    const outcome = decide({ kind: 'combine', id: 'n2' }, {
      drag: badDrag, validate: () => { calls++; return true; }
    });
    assert.notEqual(outcome.status, 'chosen');
    assert.equal(calls, 0);
  }
});
test('malformed target identities and insertion indices fail closed', () => {
  for (const target of [{ kind: 'combine' }, { kind: 'combine', id: 7 },
    { kind: 'distribution', id: '' }, { kind: 'insert', index: -1 },
    { kind: 'insert', index: 1.5 }, { kind: 'insert', index: Infinity }]) {
    let calls = 0;
    const outcome = decide(target, { validate: () => { calls++; return true; } });
    assert.notEqual(outcome.status, 'chosen');
    assert.equal(calls, 0);
  }
});
test('throwing eligibility adapter cannot authorize a transformation', () => {
  const outcome = decide({ kind: 'combine', id: 'n2' }, {
    validate: () => { throw Error('source changed during validation'); }
  });
  assert.notEqual(outcome.status, 'chosen');
});
test('mathematical eligibility must be explicitly true', () => {
  for (const value of [undefined, null, 1, 'true', { eligible: true }]) {
    const outcome = decide({ kind: 'combine', id: 'n2' }, { validate: () => value });
    assert.equal(outcome.status, 'none');
  }
});
