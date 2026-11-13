import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewMode } from '../../../js/view/viewMode.js';
// The preview lease now comes from the view mode (stage 2); the old separate
// registry is gone. createModalPreviewOwnership(id) is kept as a local name.
const createModalPreviewOwnership = viewId => createViewMode(viewId).preview;
import { createPreviewSessionHost } from '../../../js/steps/previewSessionHost.js';

// Exercise the actual shared host with the distribution presentation shape:
// the proposal holds a detached result while the amber overlay shows the
// source plan. These are contract tests, not browser-geometry assertions.
function fixture() {
  const ownership = createModalPreviewOwnership('equation');
  const source = { documentId:'doc', objectId:'object', revision:2, rootId:'root', fingerprint:'before' };
  const proposal = { result: { root:{ id:'result', type:'Symbol', name:'x' },
    plan:{ direction:'left', sourceFactorId:'factor', sumId:'sum' }, provenance:{} } };
  let visual = null;
  const host = createPreviewSessionHost({ ownership, viewId:'equation', owner:'distribution',
    presentation: {
      show(candidate) { visual = { ...candidate.result.plan, sourceText:'x' }; },
      clear() { visual = null; }
    } });
  return { ownership, source, proposal, host, visual:()=>visual };
}
test('distribution preview retains detached proposal and clears amber visual after confirmation', () => {
  const f=fixture();
  assert.equal(f.host.open({candidate:f.proposal,stamp:f.source}),true);
  assert.equal(f.visual().sourceFactorId,'factor');
  let committed;
  assert.equal(f.host.confirm(f.source,p=>{committed=p.result.root.id;}).status,'committed');
  assert.equal(committed,'result');
  assert.equal(f.visual(),null);
  assert.equal(f.ownership.active(),null);
  assert.equal(f.host.confirm(f.source,()=>assert.fail()).status,'absent');
});
test('distribution preview cancellation does not publish the candidate', () => {
  const f=fixture();
  f.host.open({candidate:f.proposal,stamp:f.source});
  f.host.cancel(); f.host.cancel();
  assert.equal(f.visual(),null);
  assert.equal(f.host.isOpen(),false);
  assert.equal(f.ownership.active(),null);
});
test('distribution preview stale source cannot commit', () => {
  const f=fixture();
  f.host.open({candidate:f.proposal,stamp:f.source});
  assert.equal(f.host.confirm({...f.source,revision:3},()=>assert.fail()).status,'stale');
  assert.equal(f.visual(),null);
  assert.equal(f.ownership.active(),null);
});
