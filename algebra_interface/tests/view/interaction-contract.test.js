/**
 * Phase 3E cross-family characterization: test the shared ownership contract
 * without mocking DOM events or weakening feature-specific mathematical gates.
 * These cases guard future Phase 4/5 refactors against cross-owner fallback,
 * accidental publication permission, and ambiguity caused by recognizer order.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { arbitrateIntents } from '../../js/view/drag/intentArbitration.js';
import { shouldCompleteTouchTap, classifyOccurrenceKey } from '../../js/view/selectionCommandRouting.js';

const context = (owner, proposals = []) => ({
  viewId: 'view-A', objectId: 'object-A', sessionToken: 'session-A',
  owner, proposals, active: true, sourceValid: true, modalBlocked: false
});
const proposal = (kind, extras = {}) => ({
  kind, viewId: 'view-A', objectId: 'object-A', sessionToken: 'session-A',
  eligible: true, ...extras
});

test('each transforming gesture owner rejects intents owned by another family', () => {
  const capabilities = {
    'ordinary-drag': ['combine', 'factorise'],
    'factor-drag': ['factorise', 'identity'],
    'identity-drag': ['identity', 'group'],
    grouping: ['group', 'negation-expand'],
    'negation-operator': ['negation-expand', 'distribution']
  };
  for (const [owner, [allowed, forbidden]] of Object.entries(capabilities)) {
    assert.equal(arbitrateIntents(context(owner, [proposal(allowed)])).status, 'chosen', owner);
    const denied = arbitrateIntents(context(owner, [proposal(forbidden)]));
    assert.equal(denied.status, 'blocked', owner);
    assert.equal(denied.reason, 'wrong-gesture-owner', owner);
  }
});

test('a different view, object, or session never borrows another gesture authority', () => {
  for (const key of ['viewId', 'objectId', 'sessionToken']) {
    const altered = proposal('group', { [key]: 'another' });
    assert.equal(arbitrateIntents(context('grouping', [altered])).status, 'blocked', key);
  }
});

test('cancelled, stale and modal-blocked sessions cannot choose otherwise eligible intents', () => {
  const candidate = proposal('factorise');
  for (const change of [{ active: false }, { sourceValid: false }, { modalBlocked: true }]) {
    assert.equal(arbitrateIntents({ ...context('factor-drag', [candidate]), ...change }).status, 'blocked');
  }
});

test('distinct same-kind targets remain ambiguous independent of recognizer order', () => {
  const a = proposal('combine', { sourceOccurrenceId: 'a', targetOccurrenceId: 'b' });
  const b = proposal('combine', { sourceOccurrenceId: 'a', targetOccurrenceId: 'c' });
  for (const candidates of [[a, b], [b, a]]) {
    const decision = arbitrateIntents(context('ordinary-drag', candidates));
    assert.equal(decision.status, 'blocked');
    assert.equal(decision.reason, 'ambiguous-intents');
  }
});

test('selection cannot be transformed by the shared arbiter', () => {
  for (const owner of ['keyboard', 'touch-selection']) {
    assert.equal(arbitrateIntents(context(owner, [proposal('group')])).status, 'blocked');
  }
  assert.equal(classifyOccurrenceKey({ key: 'Enter', ctrlKey: true }), 'toggle-selection');
  assert.equal(classifyOccurrenceKey({ key: 'ArrowRight' }), 'request-rearrangement');
  assert.equal(shouldCompleteTouchTap({ tap: { pointerId: 3 }, pointerId: 3,
    moved: false, activeDrag: true, groupingNormal: true, factorisationNormal: true }), false);
});
