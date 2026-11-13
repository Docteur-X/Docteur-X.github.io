/** Phase 5D-4: explicit view isolation and fail-fast refresh ordering.
 * These tests protect composition boundaries without inventing a new renderer. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEquationSemanticRefresh } from '../../js/view/equationSemanticRefresh.js';
import { createEquationLayoutTransition } from '../../js/view/equationLayoutTransition.js';

function makeView(label) {
  const attrs = new Map();
  const events = [];
  const wrapper = { setAttribute: (key, value) => attrs.set(key, value) };
  const view = { closest: () => wrapper };
  const consumer = name => ({ refresh: () => events.push(name) });
  const sync = createEquationSemanticRefresh({ view, resolver: consumer('resolver'),
    inspector: consumer('inspector'), navigator: consumer('navigator') });
  return { label, attrs, events, sync };
}

test('5D-4 independent view adapters never stamp or refresh another view', () => {
  const left = makeView('left');
  const right = makeView('right');
  left.sync.refresh({ documentId: 'doc', objectId: 'object-a' });
  assert.equal(right.attrs.size, 0);
  assert.deepEqual(right.events, []);
  right.sync.refresh({ documentId: 'doc', objectId: 'object-b' });
  left.sync.refresh({ documentId: 'doc', objectId: null });
  assert.equal(left.attrs.get('data-object-id'), '');
  assert.equal(right.attrs.get('data-object-id'), 'object-b');
  assert.deepEqual(right.events, ['resolver', 'inspector', 'navigator']);
});

test('5D-4 resolver failure prevents dependent semantic consumers from using stale index', () => {
  const events = [];
  const sync = createEquationSemanticRefresh({
    view: { closest: () => null },
    resolver: { refresh() { events.push('resolver'); throw new Error('index unavailable'); } },
    inspector: { refresh() { events.push('inspector'); } },
    navigator: { refresh() { events.push('navigator'); } }
  });
  assert.throws(() => sync.refresh(), /index unavailable/);
  assert.deepEqual(events, ['resolver']);
});

test('5D-4 layout transitions capture and animate only within their injected roots', () => {
  const frames = [];
  const item = (id, x) => ({ dataset: { nodeId: id }, style: {},
    matches: () => true, getBoundingClientRect: () => ({ left: x, top: 0 }) });
  const aOld = item('shared-id', 0), aNew = item('shared-id', 40);
  const bOld = item('shared-id', 5), bNew = item('shared-id', 5);
  let aCurrent = [aOld], bCurrent = [bOld];
  const root = get => ({ querySelectorAll: () => get() });
  const args = { prefersReducedMotion: () => false, requestFrame: cb => frames.push(cb) };
  const a = createEquationLayoutTransition({ root: root(() => aCurrent), ...args });
  const b = createEquationLayoutTransition({ root: root(() => bCurrent), ...args });
  const firstA = a.capture(), firstB = b.capture();
  aCurrent = [aNew]; bCurrent = [bNew];
  a.animate(firstA); b.animate(firstB);
  assert.equal(aNew.style.transform, 'translate(-40px, 0px)');
  assert.equal(bNew.style.transform, undefined);
  assert.equal(frames.length, 1);
  frames[0]();
  assert.equal(aNew.style.transform, '');
});
