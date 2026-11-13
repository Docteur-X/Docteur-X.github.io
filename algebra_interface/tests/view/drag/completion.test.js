import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyOrdinaryDragCompletion as classify } from '../../../js/view/drag/ordinaryDragCompletion.js';

test('cancelled releases never dispatch a mathematical action', () => {
  for (const kind of ['distribution', 'combine', 'insert', 'negation-compress']) {
    assert.equal(classify({ commit: false, moved: true, targetKind: kind, hasDistributionPlan: true }), 'cancel');
  }
});

test('unmoved releases are selection, regardless of hover target', () => {
  assert.equal(classify({ commit: true, moved: false, targetKind: 'combine' }), 'select');
});

test('validated moved targets select the correct side-effect pathway', () => {
  for (const kind of ['combine', 'insert']) {
    assert.equal(classify({ commit: true, moved: true, targetKind: kind }), kind);
  }
  // A rule-contributed kind exits through that rule, only when declared.
  assert.equal(classify({ commit: true, moved: true, targetKind: 'negation-compress', ruleTargetKinds: ['negation-compress'] }), 'negation-compress');
  assert.equal(classify({ commit: true, moved: true, targetKind: 'negation-compress' }), 'cancel');
});

test('distribution requires a plan and unknown targets cancel', () => {
  assert.equal(classify({ commit: true, moved: true, targetKind: 'distribution', hasDistributionPlan: true }), 'distribution');
  assert.equal(classify({ commit: true, moved: true, targetKind: 'distribution', hasDistributionPlan: false }), 'cancel');
  assert.equal(classify({ commit: true, moved: true, targetKind: 'invalid' }), 'cancel');
});
