import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createViewMode } from '../../js/view/viewMode.js';
// The preview lease now comes from the view mode (stage 2); the old separate
// registry is gone. createModalPreviewOwnership(id) is kept as a local name.
const createModalPreviewOwnership = viewId => createViewMode(viewId).preview;

const req = (owner = 'grouping', viewId = 'view-a') => ({
  viewId, owner, documentId: 'doc-1', objectId: 'object-1',
  sessionToken: `${owner}-session`
});

test('4B: one view grants only one incompatible modal preview lease', () => {
  const registry = createModalPreviewOwnership('view-a');
  const first = registry.acquire(req());
  assert.equal(first.status, 'acquired');
  assert.equal(registry.acquire(req('negation')).status, 'occupied');
  assert.equal(registry.active(), first.lease);
  assert.equal(registry.release(first.lease), true);
  assert.equal(registry.acquire(req('negation')).status, 'acquired');
});

test('4B: stale and forged leases cannot release another owner', () => {
  const registry = createModalPreviewOwnership('view-a');
  const first = registry.acquire(req()).lease;
  assert.equal(registry.release({ ...first, owner: 'equality' }), false);
  assert.equal(registry.release(first), true);
  const second = registry.acquire(req()).lease;
  assert.notEqual(first.leaseId, second.leaseId);
  assert.equal(registry.release(first), false);
  assert.equal(registry.owns(second), true);
});

test('4B: independent views do not share modal ownership', () => {
  const a = createModalPreviewOwnership('view-a');
  const b = createModalPreviewOwnership('view-b');
  assert.equal(a.acquire(req()).status, 'acquired');
  assert.equal(b.acquire(req('negation', 'view-b')).status, 'acquired');
  assert.equal(a.acquire(req('equality', 'view-b')).status, 'invalid');
  assert.equal(b.active().owner, 'negation');
});

test('4B: malformed request fails closed without displacing an owner', () => {
  const registry = createModalPreviewOwnership('view-a');
  const first = registry.acquire(req()).lease;
  for (const bad of [null, {}, { ...req(), sessionToken: '' }, { ...req(), objectId: null }, { ...req(), viewId: 'other' }]) {
    assert.equal(registry.acquire(bad).status, 'invalid');
    assert.equal(registry.active(), first);
  }
});

test('4B: cancellation and invalidation are idempotent; disposal is terminal', () => {
  const registry = createModalPreviewOwnership('view-a');
  const lease = registry.acquire(req()).lease;
  registry.invalidate();
  registry.invalidate();
  assert.equal(registry.release(lease), false);
  assert.equal(registry.acquire(req()).status, 'acquired');
  registry.dispose();
  registry.dispose();
  assert.equal(registry.active(), null);
  assert.equal(registry.acquire(req()).status, 'disposed');
});

test('4B: returned identity cannot be mutated by callers', () => {
  const registry = createModalPreviewOwnership('view-a');
  const input = req();
  const lease = registry.acquire(input).lease;
  input.owner = 'equality';
  assert.equal(registry.active().owner, 'grouping');
  assert.equal(Object.isFrozen(lease), true);
  assert.equal(registry.release(lease), true);
});
