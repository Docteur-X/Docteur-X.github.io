import test from 'node:test';
import assert from 'node:assert/strict';
import { mountEquationPresentation } from '../../js/view/equationPresentationMount.js';

function fixture() {
  const calls = [];
  const record = name => (...args) => { calls.push([name, ...args]); };
  const options = {
    equation: { replaceChildren: record('replace') }, tree: { id: 'new-tree' },
    resolver: { invalidate: record('invalidate') },
    semanticRefresh: { refresh: record('refresh') },
    documentId: 'doc', objectId: 'object',
    clearHover: record('hover'), afterMount: record('after-mount'),
    updateToolbars: record('toolbars'),
    paintSelection: record('selection'), paintDecorations: record('decorations'),
    animateLayout: record('animate'), firstRects: new Map()
  };
  return { calls, options };
}

test('invalidates stale hitboxes before replacing DOM and reindexes before consumers', () => {
  const { calls, options } = fixture();
  mountEquationPresentation(options);
  assert.deepEqual(calls.map(([name]) => name), [
    'invalidate', 'replace', 'refresh', 'hover', 'after-mount',
    'toolbars', 'selection', 'decorations', 'animate'
  ]);
  assert.equal(calls[1][1], options.tree);
  assert.deepEqual(calls[2][1], { documentId: 'doc', objectId: 'object' });
  assert.equal(calls.at(-1)[1], options.firstRects);
});

test('empty mathematical objects are mounted and indexed with nullable identities', () => {
  const { calls, options } = fixture();
  mountEquationPresentation({ ...options, tree: null, documentId: null, objectId: null });
  // Passing null directly to DOM.replaceChildren would insert text "null".
  assert.deepEqual(calls[1], ['replace']);
  assert.deepEqual(calls[2][1], { documentId: null, objectId: null });
});

test('rejects missing collaborators before replacing any DOM', () => {
  const { calls, options } = fixture();
  assert.throws(() => mountEquationPresentation({ ...options, paintSelection: null }), TypeError);
  assert.deepEqual(calls, []);
});


test('failed semantic refresh invalidates the partial mount and skips visual consumers', () => {
  const { calls, options } = fixture();
  const failure = new Error('semantic index unavailable');
  options.semanticRefresh.refresh = () => { calls.push(['refresh']); throw failure; };
  assert.throws(() => mountEquationPresentation(options), error => error === failure);
  assert.deepEqual(calls.map(([name]) => name), [
    'invalidate', 'replace', 'refresh', 'invalidate'
  ]);
});

test('failed overlay painting invalidates semantic targets and preserves the failure', () => {
  const { calls, options } = fixture();
  const failure = new Error('overlay failed');
  options.paintDecorations = () => { calls.push(['decorations']); throw failure; };
  assert.throws(() => mountEquationPresentation(options), error => error === failure);
  assert.deepEqual(calls.map(([name]) => name), [
    'invalidate', 'replace', 'refresh', 'hover', 'after-mount',
    'toolbars', 'selection', 'decorations', 'invalidate'
  ]);
});

test('failed defensive invalidation never masks the original rendering error', () => {
  const { calls, options } = fixture();
  let invalidations = 0;
  options.resolver.invalidate = () => {
    invalidations += 1;
    if (invalidations === 2) throw new Error('invalidation also failed');
  };
  const failure = new Error('DOM replacement failed');
  options.equation.replaceChildren = () => { calls.push(['replace']); throw failure; };
  assert.throws(() => mountEquationPresentation(options), error => error === failure);
  assert.equal(invalidations, 2);
});

// Each presentation consumer is part of one synchronous publication transaction.
// If one fails, semantic addresses must not point into an incompletely painted view.
// Keep these cases explicit so callback additions or ordering changes are reviewed.
const presentationFailures = [
  ['hover cleanup', 'clearHover', 'hover'],
  ['after-mount hooks', 'afterMount', 'after-mount'],
  ['selection toolbars', 'updateToolbars', 'toolbars'],
  ['selection painting', 'paintSelection', 'selection'],
  ['layout animation', 'animateLayout', 'animate']
];

for (const [description, callback, marker] of presentationFailures) {
  test(`failed ${description} invalidates semantic targets and stops subsequent callbacks`, () => {
    const { calls, options } = fixture();
    const failure = new Error(`${description} failed`);
    options[callback] = () => { calls.push([marker]); throw failure; };

    assert.throws(() => mountEquationPresentation(options), error => error === failure);
    const expectedOrder = [
      'invalidate', 'replace', 'refresh', 'hover', 'after-mount',
      'toolbars', 'selection', 'decorations', 'animate'
    ];
    const throughFailure = expectedOrder.slice(0, expectedOrder.indexOf(marker) + 1);
    assert.deepEqual(calls.map(([name]) => name), [...throughFailure, 'invalidate']);
    assert.equal(calls.filter(([name]) => name === 'invalidate').length, 2);
  });
}
