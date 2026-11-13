import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewMode } from '../../js/view/viewMode.js';
// The preview lease now comes from the view mode (stage 2); the old separate
// registry is gone. createModalPreviewOwnership(id) is kept as a local name.
const createModalPreviewOwnership = viewId => createViewMode(viewId).preview;
import { createPreviewSessionHost } from '../../js/steps/previewSessionHost.js';
import { createTransformationCommitLifecycle } from '../../js/steps/transformationCommitLifecycle.js';

// Characterisation of the architectural boundary: a deliberately confirmed
// preview holds a view-local lease; immediate operations use a separate
// single-use commit gate and must be blocked by the application's modal guard.
const stamp = () => ({ documentId: 'd', objectId: 'o', revision: 1, rootId: 'r', fingerprint: 'a' });
const candidate = () => ({ result: { root: { type: 'Symbol', id: 'r' } } });
function family(ownership, owner, events) {
  return createPreviewSessionHost({ ownership, viewId: 'view', owner,
    presentation: {
      show: () => events.push(`${owner}:show`),
      clear: () => events.push(`${owner}:clear`)
    }
  });
}

test('different preview families cannot replace each other and can open after release', () => {
  const ownership = createModalPreviewOwnership('view');
  const events = [];
  const grouping = family(ownership, 'grouping', events);
  const equality = family(ownership, 'equality', events);
  assert.equal(grouping.open({ candidate: candidate(), stamp: stamp() }), true);
  assert.equal(equality.open({ candidate: candidate(), stamp: stamp() }), false);
  assert.equal(ownership.active().owner, 'grouping');
  grouping.cancel();
  assert.equal(equality.open({ candidate: candidate(), stamp: stamp() }), true);
  assert.equal(equality.confirm(stamp(), () => {}).status, 'committed');
  assert.equal(ownership.active(), null);
  assert.deepEqual(events, ['grouping:show', 'grouping:clear', 'equality:show', 'equality:clear']);
});

test('external invalidation of old preview does not release a newer family lease', () => {
  const ownership = createModalPreviewOwnership('view');
  const old = family(ownership, 'negation', []);
  const newer = family(ownership, 'factorisation', []);
  old.open({ candidate: candidate(), stamp: stamp() });
  ownership.invalidate();
  newer.open({ candidate: candidate(), stamp: stamp() });
  assert.equal(old.confirm(stamp(), () => assert.fail('stale preview committed')).status, 'invalidated');
  assert.equal(ownership.active().owner, 'factorisation');
  newer.cancel();
  assert.equal(ownership.active(), null);
});

test('immediate transformation gate is single-use but does not itself enforce modal exclusivity', () => {
  const ownership = createModalPreviewOwnership('view');
  const preview = family(ownership, 'distribution', []);
  const immediate = createTransformationCommitLifecycle();
  preview.open({ candidate: candidate(), stamp: stamp() });
  assert.equal(immediate.open(candidate(), stamp()), true);
  let commits = 0;
  assert.equal(immediate.confirm(stamp(), () => { commits++; }).status, 'committed');
  assert.equal(commits, 1);
  assert.equal(ownership.active().owner, 'distribution');
  // This is an intentional boundary test: the application MUST check the
  // ownership registry before starting immediate rearrangement/combination.
  preview.cancel();
});

test('two preview families recover from failed presentation without blocking later previews', () => {
  const ownership = createModalPreviewOwnership('view');
  const broken = createPreviewSessionHost({ ownership, viewId: 'view', owner: 'identity',
    presentation: { show: () => { throw Error('paint'); }, clear: () => {} } });
  const other = family(ownership, 'grouping', []);
  assert.throws(() => broken.open({ candidate: candidate(), stamp: stamp() }), /paint/);
  assert.equal(ownership.active(), null);
  assert.equal(other.open({ candidate: candidate(), stamp: stamp() }), true);
  other.cancel();
});
