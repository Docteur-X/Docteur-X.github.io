import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldCompleteTouchTap, classifyOccurrenceKey } from '../../js/view/selectionCommandRouting.js';

const touch = { tap: { pointerId: 4 }, pointerId: 4, moved: false,
  activeDrag: false, viewBusy: false };

test('touch tap is a selection only after a matching, stationary pointer completes', () => {
  assert.equal(shouldCompleteTouchTap(touch), true);
  for (const override of [{pointerId: 5}, {moved: true}, {tap: null}])
    assert.equal(shouldCompleteTouchTap({...touch, ...override}), false);
});
test('touch selection never consumes an active transformation or preview', () => {
  // viewBusy: any preview, or a rule's own drag or tool (stage 6: one answer).
  for (const override of [{activeDrag: true}, {viewBusy: true}, {viewBusy: undefined}])
    assert.equal(shouldCompleteTouchTap({...touch, ...override}), false);
});
test('keyboard modifier selection remains distinct from plain selection', () => {
  for (const key of ['Enter',' ']) {
    assert.equal(classifyOccurrenceKey({key,ctrlKey:true}), 'toggle-selection');
    assert.equal(classifyOccurrenceKey({key,metaKey:true}), 'toggle-selection');
    assert.equal(classifyOccurrenceKey({key}), 'select');
  }
});
test('keyboard mathematical commands are recognized but not authorized', () => {
  assert.equal(classifyOccurrenceKey({key:'d'}), 'request-distribution');
  assert.equal(classifyOccurrenceKey({key:'D'}), 'request-distribution');
  assert.equal(classifyOccurrenceKey({key:'ArrowLeft'}), 'request-rearrangement');
  assert.equal(classifyOccurrenceKey({key:'ArrowRight'}), 'request-rearrangement');
});
test('unknown keys and malformed input are inert', () => {
  for (const input of [undefined, null, {}, {key:5}, {key:'Escape'}, {key:'Tab'}])
    assert.equal(classifyOccurrenceKey(input), 'none');
  assert.equal(shouldCompleteTouchTap(), false);
});
