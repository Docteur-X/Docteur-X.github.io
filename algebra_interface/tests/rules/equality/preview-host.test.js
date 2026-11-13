import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewMode } from '../../../js/view/viewMode.js';
// The preview lease now comes from the view mode (stage 2); the old separate
// registry is gone. createModalPreviewOwnership(id) is kept as a local name.
const createModalPreviewOwnership = viewId => createViewMode(viewId).preview;
import { createPreviewSessionHost } from '../../../js/steps/previewSessionHost.js';

// Equality's presentation port retains the existing inline candidate renderer.
// These tests isolate host ownership from that renderer; the DOM is verified by
// the Playwright suite on the user's machine.
function setup() {
  const ownership = createModalPreviewOwnership('equation');
  const events = [];
  const host = createPreviewSessionHost({
    ownership, viewId: 'equation', owner: 'equality',
    presentation: {
      show: candidate => events.push(['show', candidate.equalityVisualDescription]),
      clear: () => events.push(['clear'])
    }
  });
  const stamp = { documentId: 'doc', objectId: 'eq', revision: 'r1', rootId: 'eq-root', fingerprint: 'A=B' };
  const candidate = { result: { root: { type: 'Equal', id: 'candidate' } }, equalityVisualDescription: { inserted: true } };
  return { ownership, events, host, stamp, candidate };
}

test('equality host confirms exactly once and releases its modal lease', () => {
  const f = setup();
  let commits = 0;
  assert.equal(f.host.open({ candidate: f.candidate, stamp: f.stamp }), true);
  assert.equal(f.host.open({ candidate: f.candidate, stamp: f.stamp }), false);
  assert.equal(f.host.confirm(f.stamp, () => { commits++; }).status, 'committed');
  assert.equal(f.host.confirm(f.stamp, () => { commits++; }).status, 'absent');
  assert.equal(commits, 1);
  assert.equal(f.ownership.active(), null);
  assert.deepEqual(f.events, [['show', f.candidate.equalityVisualDescription], ['clear']]);
});

test('equality host cancellation leaves candidate uncommitted and clears once', () => {
  const f = setup();
  f.host.open({ candidate: f.candidate, stamp: f.stamp });
  f.host.cancel();
  f.host.cancel();
  assert.equal(f.host.isOpen(), false);
  assert.deepEqual(f.events, [['show', f.candidate.equalityVisualDescription], ['clear']]);
  assert.equal(f.ownership.active(), null);
});

test('equality host rejects stale source and revoked ownership', () => {
  const f = setup();
  f.host.open({ candidate: f.candidate, stamp: f.stamp });
  assert.equal(f.host.confirm({ ...f.stamp, revision: 'r2' }, () => assert.fail('stale commit')).status, 'stale');
  assert.equal(f.ownership.active(), null);
  f.host.open({ candidate: f.candidate, stamp: f.stamp });
  f.ownership.invalidate();
  assert.equal(f.host.confirm(f.stamp, () => assert.fail('revoked commit')).status, 'invalidated');
  assert.equal(f.host.isOpen(), false);
});
