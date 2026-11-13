/**
 * Input router (standard 2): one listener per place and event, routes run in
 * declared order, the view mode is checked in one place, and gesture
 * declarations answer "what can I do here?".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInputRouter, modeMatches, partMatches } from '../../js/view/inputRouter.js';
import { createViewMode } from '../../js/view/viewMode.js';

// A tiny stand-in for an EventTarget: records listeners, can fire events.
function place() {
  const listeners = [];
  return {
    listeners,
    addEventListener(type, fn, capture) { listeners.push({ type, fn, capture: Boolean(capture) }); },
    fire(type, extra = {}) {
      let immediateStopped = false;
      const event = { type, ...extra, stopImmediatePropagation() { immediateStopped = true; } };
      for (const l of listeners.filter(l => l.type === type)) { if (immediateStopped) break; l.fn(event); }
      return event;
    }
  };
}
function setup() {
  const viewMode = createViewMode('equation');
  const places = { 'document-capture': place(), view: place(), 'view-parent': place(), document: place(), window: place() };
  // document-capture and document are the same node in a browser; separate stand-ins are fine here.
  return { viewMode, places, router: createInputRouter({ viewMode, places }) };
}
const lease = (viewMode, owner) => viewMode.preview.acquire({
  viewId: 'equation', owner, documentId: 'd', objectId: 'o', sessionToken: owner
}).lease;

test('one native listener per place and event, however many routes', () => {
  const { router, places } = setup();
  router.route({ name: 'a', on: 'pointerdown', at: 'view', modes: 'any', handle() {} });
  router.route({ name: 'b', on: 'pointerdown', at: 'view', modes: 'any', handle() {} });
  router.route({ name: 'c', on: 'click', at: 'view', modes: 'any', handle() {} });
  assert.equal(places.view.listeners.length, 2);
});

test('routes run in the order declared', () => {
  const { router, places } = setup();
  const ran = [];
  for (const name of ['first', 'second', 'third']) {
    router.route({ name, on: 'click', at: 'view', modes: 'any', handle: () => ran.push(name) });
  }
  places.view.fire('click');
  assert.deepEqual(ran, ['first', 'second', 'third']);
});

test('stopImmediatePropagation stops the later routes, as it stopped later listeners', () => {
  const { router, places } = setup();
  const ran = [];
  router.route({ name: 'stopper', on: 'click', at: 'view', modes: 'any', handle: e => { ran.push('stopper'); e.stopImmediatePropagation(); } });
  router.route({ name: 'later', on: 'click', at: 'view', modes: 'any', handle: () => ran.push('later') });
  places.view.fire('click');
  assert.deepEqual(ran, ['stopper']);
});

test('decision 1.2: an idle route never runs during a preview', () => {
  const { router, places, viewMode } = setup();
  const ran = [];
  router.route({ name: 'pickup', on: 'pointerdown', at: 'view', modes: 'idle', handle: () => ran.push('pickup') });
  router.route({ name: 'cancel-outside', on: 'pointerdown', at: 'view', modes: 'preview:grouping', handle: () => ran.push('cancel') });
  places.view.fire('pointerdown');
  const held = lease(viewMode, 'grouping');
  places.view.fire('pointerdown');
  viewMode.preview.release(held);
  places.view.fire('pointerdown');
  assert.deepEqual(ran, ['pickup', 'cancel', 'pickup']);
});

test('mode patterns: any, kind, kind:owner and lists', () => {
  const idle = { kind: 'idle' };
  const factor = { kind: 'dragging', owner: 'factor' };
  assert.equal(modeMatches('any', factor), true);
  assert.equal(modeMatches('idle', idle), true);
  assert.equal(modeMatches('dragging', factor), true);
  assert.equal(modeMatches('dragging:ordinary', factor), false);
  assert.equal(modeMatches(['idle', 'dragging:factor'], factor), true);
});

test('routes are checked when added', () => {
  const { router } = setup();
  assert.throws(() => router.route({ name: 'x', on: 'click', at: 'nowhere', modes: 'any', handle() {} }), TypeError);
  assert.throws(() => router.route({ name: 'x', on: 'click', at: 'view', handle() {} }), TypeError);
  router.route({ name: 'x', on: 'click', at: 'view', modes: 'any', handle() {} });
  assert.throws(() => router.route({ name: 'x', on: 'click', at: 'view', modes: 'any', handle() {} }), TypeError);
});

test('decision 2.2: "what can I do here?" comes from the declarations', () => {
  const { router, viewMode } = setup();
  router.declare({ ruleId: 'negation.expand', kind: 'activate', on: { role: 'operator', operatorKind: 'negate' } });
  router.declare({ ruleId: 'rearrangement', kind: 'drag-between', on: { role: 'occurrence', parentType: 'Add' } });
  const minus = { role: 'operator', operatorKind: 'negate', nodeId: 'n5' };
  const addend = { role: 'occurrence', parentType: 'Add', nodeType: 'Symbol' };
  assert.deepEqual(router.gesturesFor(minus).map(d => d.ruleId), ['negation.expand']);
  assert.deepEqual(router.gesturesFor(addend).map(d => d.ruleId), ['rearrangement']);
  // Nothing is offered while a preview is open.
  lease(viewMode, 'distribution');
  assert.deepEqual(router.gesturesFor(minus), []);
});

test('part patterns need every key to match', () => {
  assert.equal(partMatches({ role: 'operator' }, { role: 'operator', operatorKind: 'negate' }), true);
  assert.equal(partMatches({ role: 'operator', operatorKind: 'plus' }, { role: 'operator', operatorKind: 'negate' }), false);
});

// Since stage I1 the router reads its gesture kinds from the interaction
// definitions, which are data. That is its ONLY import, and the definitions
// themselves import only the definition helpers: still no DOM, rules,
// renderer or app state.
test('inputRouter.js imports only the interaction definitions: no DOM, rules, renderer or app state', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const importsOf = path => [...readFileSync(new URL(path, import.meta.url), 'utf8')
    .matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)].map(match => match[1]);
  assert.deepEqual(importsOf('../../js/view/inputRouter.js'), ['../definitions/interactions/interactions.js']);
  const folders = readdirSync(new URL('../../js/definitions/interactions/', import.meta.url), { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(entry => entry.name);
  for (const folder of folders) {
    assert.deepEqual(importsOf(`../../js/definitions/interactions/${folder}/index.js`), ['../../define.js'], folder);
  }
  assert.ok(importsOf('../../js/definitions/interactions/interactions.js').every(path =>
    path === '../define.js' || /^\.\/[\w-]+\/index\.js$/.test(path)));
});
