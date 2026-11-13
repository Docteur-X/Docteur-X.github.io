/**
 * Phase 4F: exercise the composition of modal exclusivity and the independent
 * single-use mathematical commit gate. These are DOM-free contract tests, not
 * substitutes for Playwright tests of the six real preview entry points.
 *
 * Deliberately do not introduce a second commit coordinator: the registry
 * chooses a preview owner; the existing lifecycle alone authorizes commits.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewMode } from '../../js/view/viewMode.js';
// The preview lease now comes from the view mode (stage 2); the old separate
// registry is gone. createModalPreviewOwnership(id) is kept as a local name.
const createModalPreviewOwnership = viewId => createViewMode(viewId).preview;
import { createTransformationCommitLifecycle } from '../../js/steps/transformationCommitLifecycle.js';

const families = ['negation', 'equality', 'identity', 'grouping', 'distribution', 'factorisation'];
const stamp = () => ({ documentId: 'document-a', objectId: 'object-a', revision: 5,
  rootId: 'root-a', fingerprint: 'source-a' });
const request = (owner, viewId = 'view-a') => ({ viewId, owner,
  documentId: 'document-a', objectId: 'object-a', sessionToken: `session-${owner}` });
const candidate = () => ({ result: { root: { type: 'Symbol', id: 'result-a' } } });

function openPreview(registry, owner) {
  const acquired = registry.acquire(request(owner));
  if (acquired.status !== 'acquired') return { status: acquired.status };
  const gate = createTransformationCommitLifecycle();
  if (!gate.open(candidate(), stamp())) {
    registry.release(acquired.lease);
    return { status: 'rejected' };
  }
  return { status: 'opened', lease: acquired.lease, gate };
}

test('4F: each of six families excludes all other modal families without replacing the incumbent', () => {
  for (const incumbent of families) {
    const registry = createModalPreviewOwnership('view-a');
    const first = openPreview(registry, incumbent);
    assert.equal(first.status, 'opened', incumbent);
    for (const challenger of families.filter(name => name !== incumbent)) {
      assert.equal(openPreview(registry, challenger).status, 'occupied', `${incumbent} versus ${challenger}`);
      assert.equal(registry.active(), first.lease, 'incumbent lease must not be replaced');
      assert.equal(first.gate.isOpen(), true, 'incumbent proposal must remain available');
    }
    first.gate.cancel();
    assert.equal(registry.release(first.lease), true);
    assert.equal(registry.active(), null);
  }
});

test('4F: cancellation and reacquisition across distinct families never publishes mathematics', () => {
  const registry = createModalPreviewOwnership('view-a');
  let commits = 0;
  for (let index = 0; index < families.length; index++) {
    const opened = openPreview(registry, families[index]);
    assert.equal(opened.status, 'opened');
    opened.gate.cancel();
    opened.gate.cancel();
    assert.equal(opened.gate.confirm(stamp(), () => commits++).status, 'absent');
    assert.equal(registry.release(opened.lease), true);
    assert.equal(registry.release(opened.lease), false);
  }
  assert.equal(commits, 0);
});

test('4F: a reentrant or repeated confirmation cannot publish twice; next owner may acquire', () => {
  const registry = createModalPreviewOwnership('view-a');
  const first = openPreview(registry, 'distribution');
  let commits = 0;
  assert.equal(first.gate.confirm(stamp(), () => {
    commits++;
    assert.equal(first.gate.confirm(stamp(), () => commits++).status, 'absent');
  }).status, 'committed');
  assert.equal(registry.release(first.lease), true);
  assert.equal(first.gate.confirm(stamp(), () => commits++).status, 'absent');
  const second = openPreview(registry, 'factorisation');
  assert.equal(second.status, 'opened');
  assert.equal(second.gate.confirm(stamp(), () => commits++).status, 'committed');
  assert.equal(registry.release(second.lease), true);
  assert.equal(commits, 2, 'one publication for each of two distinct confirmations');
});

test('4F: stale mathematical state consumes proposal without publication and releases for next owner', () => {
  const registry = createModalPreviewOwnership('view-a');
  const opened = openPreview(registry, 'grouping');
  let commits = 0;
  assert.equal(opened.gate.confirm({ ...stamp(), fingerprint: 'changed' }, () => commits++).status, 'stale');
  assert.equal(opened.gate.isOpen(), false);
  assert.equal(registry.release(opened.lease), true);
  assert.equal(openPreview(registry, 'identity').status, 'opened');
  assert.equal(commits, 0);
});

test('4F: thrown publication cannot be retried, and stale lease cannot release the next preview', () => {
  const registry = createModalPreviewOwnership('view-a');
  const first = openPreview(registry, 'equality');
  assert.throws(() => first.gate.confirm(stamp(), () => { throw Error('injected commit failure'); }), /injected commit failure/);
  assert.equal(first.gate.confirm(stamp(), () => {}).status, 'absent');
  assert.equal(registry.release(first.lease), true);
  const second = openPreview(registry, 'negation');
  assert.equal(second.status, 'opened');
  assert.equal(registry.release(first.lease), false);
  assert.equal(registry.active(), second.lease);
});

test('4F: separate view registries permit independent owners, and invalidation rejects late releases', () => {
  const a = createModalPreviewOwnership('view-a');
  const b = createModalPreviewOwnership('view-b');
  const first = openPreview(a, 'grouping');
  const other = b.acquire(request('distribution', 'view-b'));
  assert.equal(other.status, 'acquired');
  a.invalidate();
  assert.equal(a.release(first.lease), false);
  assert.equal(a.acquire(request('identity')).status, 'acquired');
  assert.equal(b.active(), other.lease);
  b.dispose();
  assert.equal(b.acquire(request('equality', 'view-b')).status, 'disposed');
});
