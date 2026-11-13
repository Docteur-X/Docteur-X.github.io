/**
 * Preview migration baseline: characterize the *combined* behaviour of the
 * existing view-local lease registry and single-use mathematical commit gate.
 * These are independent objects today. Tests intentionally wire both as the
 * application does; passing does NOT imply a unified production preview host.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewMode } from '../../js/view/viewMode.js';
// The preview lease now comes from the view mode (stage 2); the old separate
// registry is gone. createModalPreviewOwnership(id) is kept as a local name.
const createModalPreviewOwnership = viewId => createViewMode(viewId).preview;
import { createTransformationCommitLifecycle } from '../../js/steps/transformationCommitLifecycle.js';

const source = (patch = {}) => ({ documentId: 'doc', objectId: 'object', revision: 1,
  rootId: 'root', fingerprint: 'ast-v1', ...patch });
const request = (owner, token = owner) => ({ viewId: 'view', owner,
  documentId: 'doc', objectId: 'object', sessionToken: token });
const candidate = () => ({ result: { root: { id: 'candidate-root', type: 'Symbol' } } });

function open(registry, owner) {
  const acquired = registry.acquire(request(owner));
  if (acquired.status !== 'acquired') return { acquired };
  const gate = createTransformationCommitLifecycle();
  assert.equal(gate.open(candidate(), source()), true);
  return { acquired, lease: acquired.lease, gate };
}

test('preview matrix: incompatible families cannot acquire a second view lease', () => {
  const registry = createModalPreviewOwnership('view');
  const first = open(registry, 'negation');
  for (const owner of ['equality', 'distribution', 'identity', 'grouping', 'factorisation']) {
    assert.equal(open(registry, owner).acquired.status, 'occupied', owner);
  }
  first.gate.cancel();
  assert.equal(registry.release(first.lease), true);
  assert.equal(open(registry, 'grouping').acquired.status, 'acquired');
});

test('preview matrix: confirm is single-use and the caller can release the lease', () => {
  const registry = createModalPreviewOwnership('view');
  const { lease, gate } = open(registry, 'negation');
  let commits = 0;
  assert.equal(gate.confirm(source(), () => { commits++; }).status, 'committed');
  assert.equal(gate.confirm(source(), () => { commits++; }).status, 'absent');
  assert.equal(commits, 1);
  assert.equal(registry.release(lease), true);
  assert.equal(registry.active(), null);
});

test('preview matrix: cancel is idempotent and does not commit', () => {
  const registry = createModalPreviewOwnership('view');
  const { lease, gate } = open(registry, 'distribution');
  gate.cancel(); gate.cancel();
  assert.equal(gate.confirm(source(), () => assert.fail('unexpected commit')).status, 'absent');
  assert.equal(registry.release(lease), true);
  assert.equal(registry.release(lease), false);
});

test('preview matrix: changed mathematical source cannot commit', () => {
  for (const [field, value] of Object.entries({ documentId: 'other', objectId: 'other',
    revision: 2, rootId: 'other', fingerprint: 'changed' })) {
    const registry = createModalPreviewOwnership('view');
    const { lease, gate } = open(registry, 'identity');
    assert.equal(gate.confirm(source({ [field]: value }), () => assert.fail('stale commit')).status, 'stale', field);
    assert.equal(registry.release(lease), true);
  }
});

test('preview matrix: invalidation prevents old lease releasing a new preview', () => {
  const registry = createModalPreviewOwnership('view');
  const old = open(registry, 'grouping');
  registry.invalidate();
  old.gate.cancel(); // app still owns lifecycle cleanup after invalidation
  const fresh = open(registry, 'factorisation');
  assert.equal(fresh.acquired.status, 'acquired');
  assert.equal(registry.release(old.lease), false);
  assert.equal(registry.owns(fresh.lease), true);
  fresh.gate.cancel(); registry.release(fresh.lease);
});

test('preview matrix: failed publication consumes the proposal but does not auto-release ownership', () => {
  const registry = createModalPreviewOwnership('view');
  const { lease, gate } = open(registry, 'equality');
  assert.throws(() => gate.confirm(source(), () => { throw new Error('publish failed'); }), /publish failed/);
  assert.equal(gate.isOpen(), false);
  // Known architectural gap: caller must release in finally; registry cannot do so.
  assert.equal(registry.owns(lease), true);
  assert.equal(registry.release(lease), true);
});
