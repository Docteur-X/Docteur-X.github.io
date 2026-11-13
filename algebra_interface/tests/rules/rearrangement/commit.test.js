/** Behavioural regression tests for pointer-drop commit/render sequencing.
 * Unlike the former source-text test, these survive safe app.js refactoring.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { completePointerRearrangement } from '../../../js/rules/rearrangement/pointerExit.js';

test('successful pointer rearrangement commits once, cleans up, and renders without FLIP', () => {
  const calls = [];
  const candidate = { id: 'candidate' };
  const result = completePointerRearrangement({
    candidate,
    commitCandidate: value => { calls.push(['commit', value]); return true; },
    clearDrag: () => calls.push(['clear']),
    render: animate => calls.push(['render', animate])
  });
  assert.equal(result, true);
  assert.deepEqual(calls, [['commit', candidate], ['clear'], ['render', false]]);
});

test('rejected pointer rearrangement still clears and renders without FLIP', () => {
  const calls = [];
  const result = completePointerRearrangement({
    candidate: null,
    commitCandidate: () => { calls.push('reject'); return false; },
    clearDrag: () => calls.push('clear'),
    render: animate => calls.push(['render', animate])
  });
  assert.equal(result, false);
  assert.deepEqual(calls, ['reject', 'clear', ['render', false]]);
});

test('missing required effects are rejected before any work', () => {
  assert.throws(() => completePointerRearrangement({ commitCandidate: () => true }), TypeError);
});
