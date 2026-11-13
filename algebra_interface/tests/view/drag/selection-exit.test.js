import test from 'node:test';
import assert from 'node:assert/strict';
import { completeOrdinaryDragSelection } from '../../../js/view/drag/ordinaryDragSelectionExit.js';

function harness(pointerType = 'mouse', previousClick = null) {
  const calls = [];
  const effects = Object.fromEntries([
    'clearDrag','selectTouchNode','setLastClick','setSelectedNode',
    'clearMultiSelection','clearGroupingOverlay','toggleSelectedGroup',
    'render','setStatus','describeExpression'
  ].map(name => [name, (...args) => { calls.push([name, ...args]); return name === 'describeExpression' ? 'x' : undefined; }]));
  return { calls, args: { drag: { item: { id: 'n1' }, pointerType }, previousClick, now: 1000, ...effects } };
}

test('ordinary selection exit cleans up before rendering and describes selection', () => {
  const { calls, args } = harness();
  assert.equal(completeOrdinaryDragSelection(args), 'selected');
  assert.deepEqual(calls.map(c => c[0]), [
    'setLastClick','setSelectedNode','clearMultiSelection','clearGroupingOverlay',
    'clearDrag','render','describeExpression','setStatus'
  ]);
  assert.equal(calls.at(-1)[1].includes('Selected x.'), true);
});

test('double-click toggles brackets without rendering or status update', () => {
  const { calls, args } = harness('mouse', { nodeId: 'n1', time: 750 });
  assert.equal(completeOrdinaryDragSelection(args), 'double-click');
  assert.deepEqual(calls.at(-1), ['toggleSelectedGroup']);
  assert.deepEqual(calls[0], ['setLastClick', null]);
});

test('touch selection uses its separate policy and cleans up first', () => {
  const { calls, args } = harness('touch');
  assert.equal(completeOrdinaryDragSelection(args), 'touch');
  assert.deepEqual(calls, [['clearDrag'], ['selectTouchNode', 'n1']]);
});

test('invalid exit dependencies are rejected before side effects', () => {
  const { calls, args } = harness();
  delete args.clearDrag;
  assert.throws(() => completeOrdinaryDragSelection(args), TypeError);
  assert.equal(calls.length, 0);
});
