import test from 'node:test';
import assert from 'node:assert/strict';
import { arbitrateIntents } from '../../../js/view/drag/intentArbitration.js';

const context = { viewId: 'view-A', objectId: 'object-A', sessionToken: 'gesture-1',
  owner: 'ordinary-drag', active: true, sourceValid: true, modalBlocked: false };
const proposal = (kind, overrides = {}) => ({ kind, viewId: context.viewId,
  objectId: context.objectId, sessionToken: context.sessionToken,
  eligible: true, settled: true, sourceOccurrenceId: 'n1',
  targetOccurrenceId: 'n2', ...overrides });
const decide = (proposals, overrides = {}) => arbitrateIntents({ ...context, proposals, ...overrides });

test('empty or mathematically ineligible proposals never select a transformation', () => {
  assert.equal(decide([]).status, 'none');
  assert.equal(decide([proposal('combine', { eligible: false })]).status, 'none');
});
test('ordinary geometric precedence is explicit and independent of input ordering', () => {
  const candidates = [proposal('insert'), proposal('combine'), proposal('distribution')];
  assert.equal(decide(candidates).proposal.kind, 'distribution');
  assert.equal(decide(candidates.reverse()).proposal.kind, 'distribution');
  assert.equal(decide([proposal('insert'), proposal('combine')]).proposal.kind, 'combine');
});
test('eligible minus-one compression specifically overrides ordinary geometry', () => {
  assert.equal(decide([proposal('combine'), proposal('negation-compress')]).proposal.kind, 'negation-compress');
  assert.equal(decide([proposal('combine'), proposal('negation-compress', { eligible: false })]).proposal.kind, 'combine');
});
test('unsettled insertion and rearrangement cannot be selected', () => {
  assert.equal(decide([proposal('insert', { settled: false })]).status, 'none');
  assert.equal(decide([proposal('rearrange', { settled: false })]).status, 'none');
  assert.equal(decide([proposal('insert', { settled: false }), proposal('combine')]).proposal.kind, 'combine');
});
test('cancelled, stale, or modal-blocked sessions cannot choose', () => {
  for (const overrides of [{ active: false }, { sourceValid: false }, { modalBlocked: true }]) {
    assert.equal(decide([proposal('combine')], overrides).status, 'blocked');
  }
});
test('mismatched view, object, or token blocks the whole decision', () => {
  for (const overrides of [{ viewId: 'view-B' }, { objectId: 'object-B' }, { sessionToken: 'old' }]) {
    assert.equal(decide([proposal('combine', overrides)]).status, 'blocked');
  }
});
test('mixed-owner intents and unknown kinds fail closed', () => {
  assert.equal(decide([proposal('factorise')]).reason, 'wrong-gesture-owner');
  assert.equal(decide([proposal('unknown')]).status, 'blocked');
  assert.equal(decide([proposal('combine')], { owner: 'factor-drag' }).status, 'blocked');
  assert.equal(decide([proposal('factorise')], { owner: 'factor-drag' }).status, 'chosen');
});
test('ambiguous same-kind targets are blocked rather than array-order selected', () => {
  assert.equal(decide([proposal('combine'), proposal('combine', { targetOccurrenceId: 'n3' })]).reason, 'ambiguous-intents');
});
test('decisions do not mutate input proposals or session', () => {
  const candidate = proposal('combine');
  const input = { ...context, proposals: [candidate] };
  const before = JSON.stringify(input);
  const decision = arbitrateIntents(input);
  assert.equal(JSON.stringify(input), before);
  assert.equal(decision.status, 'chosen');
  assert.notEqual(decision.proposal, candidate);
  assert.ok(Object.isFrozen(decision));
  assert.ok(Object.isFrozen(decision.proposal));
});
test('missing positive source validation is never silently accepted', () => {
  assert.equal(arbitrateIntents({ ...context, sourceValid: undefined, proposals: [proposal('combine')] }).reason, 'stale-source');
});


test('specific owners cannot claim unrelated non-drag intents', () => {
  const allowed = { 'factor-drag': 'factorise', 'identity-drag': 'identity',
    grouping: 'group', 'negation-operator': 'negation-expand' };
  for (const [owner, kind] of Object.entries(allowed)) {
    assert.equal(decide([proposal(kind)], { owner }).status, 'chosen');
    for (const other of ['factorise', 'identity', 'group', 'negation-expand']) {
      if (other !== kind) assert.equal(decide([proposal(other)], { owner }).reason, 'wrong-gesture-owner');
    }
  }
  for (const owner of ['keyboard', 'touch-selection']) {
    assert.equal(decide([], { owner }).status, 'none');
    assert.equal(decide([proposal('group')], { owner }).reason, 'wrong-gesture-owner');
  }
});

test('identical recognizer reports coalesce, but distinct mathematical actions block', () => {
  const a = proposal('combine');
  assert.equal(decide([a, { ...a }]).status, 'chosen');
  assert.equal(decide([a, { ...a, insertionIndex: 2 }]).reason, 'ambiguous-intents');
  assert.equal(decide([a, { ...a, targetOccurrenceId: 'n3' }]).reason, 'ambiguous-intents');
});

test('unsettled proposals are advisory none, not cancellation or permission to commit', () => {
  const decision = decide([proposal('rearrange', { settled: false })]);
  assert.deepEqual([decision.status, decision.reason], ['none', 'no-eligible-intent']);
  assert.equal(decide([proposal('insert', { settled: true })]).status, 'chosen');
});

test('invalid mutable metadata fails closed and returned proposals cannot retain extra objects', () => {
  assert.equal(decide([proposal('combine', { evidence: { trusted: true } })]).reason, 'invalid-proposal-data');
  assert.equal(decide([proposal('insert', { insertionIndex: -1 })]).reason, 'invalid-proposal-data');
  const nested = { value: 1 };
  const result = decide([proposal('combine', { metadata: nested })]);
  assert.equal(result.status, 'chosen');
  assert.equal(Object.hasOwn(result.proposal, 'metadata'), false);
  nested.value = 2;
  assert.equal(Object.isFrozen(result.proposal), true);
});

test('eligibility evidence is not authenticated by the arbiter', () => {
  const result = decide([proposal('combine', { evidence: 'rule-adapter' })]);
  assert.equal(result.status, 'chosen');
  assert.equal(result.proposal.evidence, 'rule-adapter');
  // Advisory selection is never permission to skip final mathematical validation.
});
