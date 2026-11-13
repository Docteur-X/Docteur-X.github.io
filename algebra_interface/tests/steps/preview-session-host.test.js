import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewMode } from '../../js/view/viewMode.js';
// The preview lease now comes from the view mode (stage 2); the old separate
// registry is gone. createModalPreviewOwnership(id) is kept as a local name.
const createModalPreviewOwnership = viewId => createViewMode(viewId).preview;
import { createPreviewSessionHost } from '../../js/steps/previewSessionHost.js';

const stamp = () => ({ documentId:'doc', objectId:'obj', revision:1, rootId:'root', fingerprint:'v1' });
const candidate = () => ({ result:{root:{type:'Symbol',id:'root'}} });
function setup(presentation = {}) {
  const ownership = createModalPreviewOwnership('view');
  let shown = 0, cleared = 0;
  const host = createPreviewSessionHost({ ownership, viewId:'view', owner:'negation', presentation: {
    show: value => { shown++; presentation.show?.(value); },
    clear: () => { cleared++; presentation.clear?.(); }
  }});
  return { host, ownership, counts: () => ({ shown, cleared }) };
}
test('preview host opens exclusively and confirms exactly once', () => {
  const {host, ownership, counts} = setup();
  assert.equal(host.open({candidate:candidate(), stamp:stamp()}), true);
  assert.equal(host.open({candidate:candidate(), stamp:stamp()}), false);
  let commits=0;
  assert.equal(host.confirm(stamp(), () => commits++).status, 'committed');
  assert.equal(host.confirm(stamp(), () => commits++).status, 'absent');
  assert.equal(commits,1);
  assert.equal(ownership.active(),null);
  assert.deepEqual(counts(),{shown:1,cleared:1});
});
test('stale confirmation clears candidate and releases lease', () => {
  const {host,ownership}=setup();
  host.open({candidate:candidate(),stamp:stamp()});
  assert.equal(host.confirm({...stamp(),fingerprint:'changed'},()=>assert.fail()).status,'stale');
  assert.equal(host.isOpen(),false);
  assert.equal(ownership.active(),null);
});
test('presentation failure releases ownership and consumes proposal', () => {
  const {host,ownership}=setup({show:()=>{throw Error('render failed');}});
  assert.throws(()=>host.open({candidate:candidate(),stamp:stamp()}),/render failed/);
  assert.equal(host.isOpen(),false);
  assert.equal(ownership.active(),null);
});
test('commit failure cannot strand a preview or retry the proposal', () => {
  const {host,ownership}=setup();
  host.open({candidate:candidate(),stamp:stamp()});
  assert.throws(()=>host.confirm(stamp(),()=>{throw Error('commit failed');}),/commit failed/);
  assert.equal(host.isOpen(),false);
  assert.equal(ownership.active(),null);
  assert.equal(host.confirm(stamp(),()=>assert.fail()).status,'absent');
});
test('host cannot replace another preview owner', () => {
  const {host,ownership}=setup();
  const other=ownership.acquire({viewId:'view',owner:'equality',documentId:'doc',objectId:'obj',sessionToken:'other'});
  assert.equal(host.open({candidate:candidate(),stamp:stamp()}),false);
  assert.equal(ownership.owns(other.lease),true);
});

// A mathematically identical source is insufficient when the rendered view has
// revoked this session's modal lease (e.g. object switch or teardown).
test('invalidated ownership cannot confirm an otherwise fresh candidate', () => {
  const {host, ownership} = setup();
  host.open({candidate:candidate(), stamp:stamp()});
  ownership.invalidate();
  let committed = false;
  assert.equal(host.confirm(stamp(), () => { committed = true; }).status, 'invalidated');
  assert.equal(committed, false);
  assert.equal(host.isOpen(), false);
});

test('commit failure remains primary when preview cleanup also fails', () => {
  const {host, ownership} = setup({clear:()=>{throw Error('cleanup failed');}});
  host.open({candidate:candidate(), stamp:stamp()});
  const originalLog = console.error;
  try {
    console.error = () => {};
    assert.throws(() => host.confirm(stamp(), () => {throw Error('commit failed');}), /commit failed/);
  } finally { console.error = originalLog; }
  assert.equal(ownership.active(), null);
  assert.equal(host.isOpen(), false);
});

test('cleanup failure after successful commit preserves committed outcome', () => {
  const {host, ownership} = setup({clear:()=>{throw Error('cleanup failed');}});
  host.open({candidate:candidate(), stamp:stamp()});
  let commits = 0;
  const result = host.confirm(stamp(), () => { commits++; });
  assert.equal(result.status, 'committed');
  assert.match(result.cleanupError.message, /cleanup failed/);
  assert.equal(commits, 1);
  assert.equal(host.confirm(stamp(), () => { commits++; }).status, 'absent');
  assert.equal(ownership.active(), null);
  assert.equal(host.isOpen(), false);
});

test('stale proposal plus cleanup failure cannot be misreported as committed', () => {
  const {host, ownership} = setup({clear:()=>{throw Error('cleanup failed');}});
  host.open({candidate:candidate(), stamp:stamp()});
  const result = host.confirm({...stamp(), fingerprint:'new'}, () => assert.fail('must not commit'));
  assert.equal(result.status, 'stale');
  assert.match(result.cleanupError.message, /cleanup failed/);
  assert.equal(ownership.active(), null);
});

// The post-render callback is part of preview entry. A failure must revoke the
// candidate and its lease just as a failure in presentation.show does.
test('post-show callback failure cleans presentation and releases lease', () => {
  const {host, ownership, counts} = setup();
  assert.throws(() => host.open({
    candidate: candidate(), stamp: stamp(),
    onShown: () => { throw Error('post-show failed'); }
  }), /post-show failed/);
  assert.deepEqual(counts(), {shown:1, cleared:1});
  assert.equal(host.isOpen(), false);
  assert.equal(ownership.active(), null);
  assert.equal(host.confirm(stamp(), () => assert.fail('cannot commit')).status, 'absent');
});

test('explicit cancellation releases lease even if presentation cleanup throws', () => {
  const {host, ownership} = setup({clear: () => { throw Error('cleanup failed'); }});
  assert.equal(host.open({candidate:candidate(), stamp:stamp()}), true);
  assert.throws(() => host.cancel(), /cleanup failed/);
  assert.equal(host.isOpen(), false);
  assert.equal(ownership.active(), null);
  assert.equal(host.confirm(stamp(), () => assert.fail('cannot commit')).status, 'absent');
});

test('view disposal prevents opening a new preview after teardown', () => {
  const {host, ownership} = setup();
  ownership.dispose();
  assert.equal(host.open({candidate:candidate(), stamp:stamp()}), false);
  assert.equal(host.isOpen(), false);
  assert.equal(ownership.active(), null);
});

// Stage 2: the preview mode ends before the presentation is cleared, so code
// running inside clear() (toolbars, re-render) already sees an idle view.
test('preview host ends the view mode before clearing its presentation', async () => {
  const { createViewMode } = await import('../../js/view/viewMode.js');
  const viewMode = createViewMode('view');
  const seen = [];
  const host = createPreviewSessionHost({ ownership: viewMode.preview, viewId: 'view', owner: 'grouping',
    presentation: { show() {}, clear() { seen.push(viewMode.isIdle()); } } });
  assert.equal(host.open({ candidate: candidate(), stamp: stamp() }), true);
  assert.equal(viewMode.isPreview('grouping'), true);
  host.cancel();
  assert.equal(host.open({ candidate: candidate(), stamp: stamp() }), true);
  host.confirm(stamp(), () => {});
  assert.deepEqual(seen, [true, true]);
});
