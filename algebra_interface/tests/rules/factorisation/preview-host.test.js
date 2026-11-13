import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewMode } from '../../../js/view/viewMode.js';
// The preview lease now comes from the view mode (stage 2); the old separate
// registry is gone. createModalPreviewOwnership(id) is kept as a local name.
const createModalPreviewOwnership = viewId => createViewMode(viewId).preview;
import { createPreviewSessionHost } from '../../../js/steps/previewSessionHost.js';

// This exercises the same presentation contract as the factorisation adapter:
// cancellation restores the original DOM, whereas successful confirmation
// discards it. The real DOM/animation remains a browser acceptance test.
function fixture() {
  const ownership = createModalPreviewOwnership('equation');
  const actions = [];
  let committed = false;
  const host = createPreviewSessionHost({
    ownership, viewId: 'equation', owner: 'factorisation',
    presentation: {
      show: () => actions.push('show-candidate'),
      clear: () => {
        actions.push(committed ? 'finish-candidate' : 'restore-original');
        committed = false;
      }
    }
  });
  const stamp = { documentId: 'd', objectId: 'o', revision: 'r', rootId: 'root', fingerprint: 'source' };
  const candidate = { result: { root: { type: 'Add', id: 'candidate' }, proposal: { root: { id: 'candidate' } } } };
  return { ownership, actions, host, stamp, candidate, markCommitted: () => { committed = true; } };
}
test('factorisation confirmation uses one modal host and finalises the candidate', () => {
  const f = fixture();
  assert.equal(f.host.open({ candidate: f.candidate, stamp: f.stamp }), true);
  assert.equal(f.host.open({ candidate: f.candidate, stamp: f.stamp }), false);
  assert.equal(f.host.confirm(f.stamp, () => f.markCommitted()).status, 'committed');
  assert.deepEqual(f.actions, ['show-candidate', 'finish-candidate']);
  assert.equal(f.ownership.active(), null);
});
test('factorisation cancellation restores the original presentation', () => {
  const f = fixture();
  f.host.open({ candidate: f.candidate, stamp: f.stamp });
  f.host.cancel();
  f.host.cancel();
  assert.deepEqual(f.actions, ['show-candidate', 'restore-original']);
  assert.equal(f.ownership.active(), null);
});
test('factorisation stale source cannot commit and restores original presentation', () => {
  const f = fixture();
  f.host.open({ candidate: f.candidate, stamp: f.stamp });
  assert.equal(f.host.confirm({ ...f.stamp, fingerprint: 'changed' }, () => assert.fail()).status, 'stale');
  assert.deepEqual(f.actions, ['show-candidate', 'restore-original']);
  assert.equal(f.ownership.active(), null);
});
