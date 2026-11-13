import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createViewMode } from '../../../js/view/viewMode.js';
// The preview lease now comes from the view mode (stage 2); the old separate
// registry is gone. createModalPreviewOwnership(id) is kept as a local name.
const createModalPreviewOwnership = viewId => createViewMode(viewId).preview;
import { createPreviewSessionHost } from '../../../js/steps/previewSessionHost.js';

const stamp = { documentId:'doc', objectId:'object', revision:1, rootId:'root', fingerprint:'root-v1' };
const candidate = { result:{ root:{ id:'candidate-root', type:'Symbol' }, identityNodeId:'new-identity' } };
function fixture() {
  const ownership = createModalPreviewOwnership('view');
  const events=[];
  const host=createPreviewSessionHost({ ownership, viewId:'view', owner:'identity', presentation:{
    show:()=>events.push('show'), clear:()=>events.push('clear')
  }});
  return { ownership, host, events };
}

test('identity confirmation consumes one proposal and releases the exclusive lease', () => {
  const {ownership,host,events}=fixture();
  assert.equal(host.open({candidate,stamp}),true);
  assert.equal(ownership.active().owner,'identity');
  let commits=0;
  assert.equal(host.confirm(stamp,()=>commits++).status,'committed');
  assert.equal(host.confirm(stamp,()=>commits++).status,'absent');
  assert.equal(commits,1);
  assert.deepEqual(events,['show','clear']);
  assert.equal(ownership.active(),null);
});

test('identity cancellation and stale source never commit', () => {
  const {host,ownership}=fixture();
  assert.equal(host.open({candidate,stamp}),true);
  host.cancel();
  assert.equal(host.confirm(stamp,()=>assert.fail('cancelled candidate committed')).status,'absent');
  assert.equal(host.open({candidate,stamp}),true);
  assert.equal(host.confirm({...stamp,revision:2},()=>assert.fail('stale candidate committed')).status,'stale');
  assert.equal(ownership.active(),null);
});

test('identity production wiring has one host and no separate modal lease or commit lifecycle', () => {
  // Since stage 4 identity lives in its rule bundle; its host comes from the
  // rule context's createPreviewHost (the shared preview host).
  const source=readFileSync(new URL('../../../js/rules/identity-element/install.js',import.meta.url),'utf8');
  assert.match(source,/const host = ctx\.createPreviewHost\(/);
  assert.match(source,/host\.open\(/);
  assert.match(source,/host\.confirm\(/);
  assert.doesNotMatch(source,/CommitLifecycle|PreviewLease|createTransformationCommitLifecycle/);
});
