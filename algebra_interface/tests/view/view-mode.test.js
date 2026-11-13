/**
 * View mode (standard 1): one mode per view, and nothing new starts unless idle.
 * Owner decision 1.2 (strict): during a preview only confirm/cancel may act,
 * so a drag can't start; during a drag a preview can't open.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createViewMode } from '../../js/view/viewMode.js';

const req = (owner = 'grouping', viewId = 'equation') => ({
  viewId, owner, documentId: 'doc-1', objectId: 'object-1', sessionToken: `${owner}-1`
});

test('a new view is idle', () => {
  const mode = createViewMode('equation');
  assert.equal(mode.isIdle(), true);
  assert.deepEqual(mode.current(), { kind: 'idle' });
  assert.equal(mode.preview.active(), null);
});

test('a preview makes the view non-idle and names its owner', () => {
  const mode = createViewMode('equation');
  const { status, lease } = mode.preview.acquire(req('factorisation'));
  assert.equal(status, 'acquired');
  assert.equal(mode.isPreview(), true);
  assert.equal(mode.isPreview('factorisation'), true);
  assert.equal(mode.isPreview('grouping'), false);
  assert.equal(mode.isIdle(), false);
  assert.equal(mode.preview.release(lease), true);
  assert.equal(mode.isIdle(), true);
});

test('decision 1.2: a drag cannot start while a preview is open', () => {
  const mode = createViewMode('equation');
  mode.preview.acquire(req());
  assert.equal(mode.beginDrag('ordinary', {}), null);
  assert.equal(mode.isPreview('grouping'), true);
});

test('a preview cannot open while a drag is in progress', () => {
  const mode = createViewMode('equation');
  const dragId = mode.beginDrag('ordinary', { item: 'a' });
  assert.equal(mode.preview.acquire(req('distribution')).status, 'occupied');
  assert.equal(mode.drag('ordinary').item, 'a');
  assert.equal(mode.endDrag(dragId), true);
  assert.equal(mode.preview.acquire(req('distribution')).status, 'acquired');
});

test('only one drag at a time, and only its own id can end it', () => {
  const mode = createViewMode('equation');
  const first = mode.beginDrag('factor', { n: 1 });
  assert.equal(mode.beginDrag('ordinary', {}), null);
  assert.equal(mode.drag('ordinary'), null);
  assert.equal(mode.endDrag(first + 1), false);
  assert.equal(mode.isDragging('factor'), true);
  assert.equal(mode.updateDrag(first, { n: 2 }), true);
  assert.equal(mode.drag('factor').n, 2);
  assert.equal(mode.endDrag(first), true);
  assert.equal(mode.endDrag(first), false);
});

test('only the live lease ends a preview; forged and stale leases fail', () => {
  const mode = createViewMode('equation');
  const first = mode.preview.acquire(req()).lease;
  assert.equal(mode.preview.release({ ...first, owner: 'equality' }), false);
  assert.equal(mode.preview.release(first), true);
  const second = mode.preview.acquire(req()).lease;
  assert.equal(mode.preview.release(first), false);
  assert.equal(mode.preview.owns(second), true);
});

test('a request for another view, or a malformed one, is refused', () => {
  const mode = createViewMode('equation');
  assert.equal(mode.preview.acquire(req('grouping', 'other-view')).status, 'invalid');
  assert.equal(mode.preview.acquire({ viewId: 'equation' }).status, 'invalid');
  assert.equal(mode.isIdle(), true);
});

test('invalidate returns to idle; dispose stops anything new', () => {
  const mode = createViewMode('equation');
  const lease = mode.preview.acquire(req()).lease;
  mode.invalidate();
  assert.equal(mode.isIdle(), true);
  assert.equal(mode.preview.owns(lease), false);
  mode.dispose();
  assert.equal(mode.preview.acquire(req()).status, 'disposed');
  assert.equal(mode.beginDrag('ordinary', {}), null);
});

test('the mode object cannot be changed from outside', () => {
  const mode = createViewMode('equation');
  mode.beginDrag('ordinary', {});
  assert.throws(() => { 'use strict'; mode.current().kind = 'idle'; }, TypeError);
});

test('viewMode.js imports nothing: no DOM, rules, renderer or app state', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('../../js/view/viewMode.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /^\s*import\s/m);
});

// Formerly tests/mathematicalInteractionGate.test.js: the gate was a second
// way of asking "is a preview open?". The view mode now answers it directly.
test('isPreview() follows the preview lease live, including invalidation and replacement', () => {
  const mode = createViewMode('v');
  const request = owner => ({ viewId: 'v', owner, documentId: 'd', objectId: 'o', sessionToken: owner });
  assert.equal(mode.isPreview(), false);
  const { lease } = mode.preview.acquire(request('grouping'));
  assert.equal(mode.isPreview(), true);
  mode.preview.release(lease);
  assert.equal(mode.isPreview(), false);
  mode.preview.acquire(request('distribution'));
  mode.preview.invalidate();
  assert.equal(mode.isPreview(), false);
  mode.preview.acquire(request('equality'));
  assert.equal(mode.isPreview('equality'), true);
});

test('onChange is told each change of kind, once', () => {
  const kinds = [];
  const mode = createViewMode('equation', { onChange: kind => kinds.push(kind) });
  const dragId = mode.beginDrag('ordinary', { n: 1 });
  mode.updateDrag(dragId, { n: 2 }); // same kind: not reported
  mode.endDrag(dragId);
  const { lease } = mode.preview.acquire(req('grouping'));
  mode.preview.release(lease);
  assert.deepEqual(kinds, ['dragging', 'idle', 'preview', 'idle']);
});
