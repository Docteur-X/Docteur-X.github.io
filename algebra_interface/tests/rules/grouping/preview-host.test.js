/** Grouping's blue presentation is feature-owned; the modal lifecycle is shared. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewMode } from '../../../js/view/viewMode.js';
// The preview lease now comes from the view mode (stage 2); the old separate
// registry is gone. createModalPreviewOwnership(id) is kept as a local name.
const createModalPreviewOwnership = viewId => createViewMode(viewId).preview;
import { createPreviewSessionHost } from '../../../js/steps/previewSessionHost.js';
import { parseExpression } from '../../helpers/legacyRootParser.js';
import { getRangeGroupingPlan } from '../../../js/engine/operations/grouping.js';
import { groupingActionRequest } from '../../../js/rules/grouping/gesture.js';
import { createApplicationTransformationFeatures } from '../../../js/app/transformationFeatureAssembly.js';
import { createTransformationCoordinator } from '../../../js/steps/transformationCoordinator.js';

function fixture() {
  const root = parseExpression('a+b+c');
  const ids = root.operands.slice(0, 2).map(node => node.id);
  const plan = getRangeGroupingPlan(root, ids);
  const candidate = createTransformationCoordinator(createApplicationTransformationFeatures())
    .propose(root, groupingActionRequest(plan, 'round'));
  const stamp = { documentId: 'doc', objectId: 'obj', revision: 'rev',
    rootId: root.id, fingerprint: JSON.stringify(root) };
  const ownership = createModalPreviewOwnership('equation');
  const visuals = [];
  const host = createPreviewSessionHost({ ownership, viewId: 'equation', owner: 'grouping',
    presentation: {
      show(proposal) { visuals.push(['show', proposal.result.plan.parentId]); },
      clear() { visuals.push(['clear']); }
    } });
  return { root, ids, candidate, stamp, ownership, visuals, host };
}

test('grouping candidate remains detached and confirms once under exclusive host', () => {
  const f = fixture();
  const before = structuredClone(f.root);
  assert.equal(f.host.open({ candidate: f.candidate, stamp: f.stamp }), true);
  assert.deepEqual(f.root, before);
  assert.equal(f.ownership.active().owner, 'grouping');
  let commits = 0;
  assert.equal(f.host.confirm(f.stamp, () => { commits++; }).status, 'committed');
  assert.equal(commits, 1);
  assert.equal(f.host.confirm(f.stamp, () => { commits++; }).status, 'absent');
  assert.equal(f.ownership.active(), null);
  assert.deepEqual(f.visuals.map(entry => entry[0]), ['show', 'clear']);
});

test('grouping cancellation and stale confirmation never commit', () => {
  const f = fixture();
  f.host.open({ candidate: f.candidate, stamp: f.stamp });
  f.host.cancel();
  assert.equal(f.host.confirm(f.stamp, () => assert.fail('cancelled')).status, 'absent');
  assert.equal(f.host.open({ candidate: f.candidate, stamp: f.stamp }), true);
  assert.equal(f.host.confirm({ ...f.stamp, fingerprint: 'changed' },
    () => assert.fail('stale')).status, 'stale');
  assert.equal(f.ownership.active(), null);
});

test('externally invalidated grouping lease cannot confirm', () => {
  const f = fixture();
  f.host.open({ candidate: f.candidate, stamp: f.stamp });
  f.ownership.invalidate();
  assert.equal(f.host.confirm(f.stamp, () => assert.fail('revoked')).status, 'invalidated');
  assert.equal(f.host.isOpen(), false);
});
