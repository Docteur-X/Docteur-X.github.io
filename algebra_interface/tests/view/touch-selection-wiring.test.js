import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { completeOrdinaryDragSelection } from '../../js/view/drag/ordinaryDragSelectionExit.js';

// Stage 6: the selection code and routes moved out of app.js; read them all.
const app = ['../../js/app.js', '../../js/view/selectionView.js', '../../js/view/equationSelectionRoutes.js', '../../js/view/equationRoutes.js']
  .map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join(String.fromCharCode(10));
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

test('touch multi-selection uses the existing selection model and preserves drag completion', () => {
  assert.match(app, /viewState\.multiSelection\.replace\(documentState\.expressionRoot, nodeId\)/);
  assert.match(app, /toggleRangeSelection\(nodeId\)/);
  // Behavioural contract: a tap must clean up before invoking touch selection.
  // Do not pin this invariant to the location or spelling of app.js code.
  const calls = [];
  const effects = Object.fromEntries([
    'clearDrag', 'selectTouchNode', 'setLastClick', 'setSelectedNode',
    'clearMultiSelection', 'clearGroupingOverlay', 'toggleSelectedGroup',
    'render', 'setStatus', 'describeExpression'
  ].map(name => [name, () => { calls.push(name); }]));
  assert.equal(completeOrdinaryDragSelection({
    drag: { item: { id: 'tap-1' }, pointerType: 'touch' },
    previousClick: null, now: 1000, ...effects
  }), 'touch');
  assert.deepEqual(calls, ['clearDrag', 'selectTouchNode']);
  assert.match(app, /if \(!viewState\.multiSelection\.size\(\)\) viewState\.touchMultiSelectMode = false/);
});

test('selection toolbar exposes a pressed state and a touch-accessible control', () => {
  assert.match(html, /id="multiSelectButton"[^>]*aria-pressed="false"/);
  assert.match(app, /dom\.multiSelectButton\.setAttribute\("aria-pressed"/);
});
