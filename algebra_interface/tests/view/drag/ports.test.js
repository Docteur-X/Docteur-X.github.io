import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrdinaryDragPorts } from '../../../js/view/drag/ordinaryDragPorts.js';
import { createOrdinaryDragController } from '../../../js/view/drag/ordinaryDragController.js';
const fn = () => {};
function valid() {
  return {
    state: { getDrag: fn, publishDrag: fn },
    source: { resolver: {}, viewId: 'equation', getObjectId: fn,
      getExpressionRoot: fn, getSourceStamp: fn, getRenderGeneration: fn,
      locateNode: fn, createSession: fn },
    presentation: { createGhost: fn, captureGeometry: fn, positionGhost: fn,
      isInsideEquation: fn, feedback: { settleForRelease: fn, isPointInPreview: fn } },
    policy: { canStart: fn },
    lifecycle: { updateTarget: fn, finishDrag: fn, cancelDrag: fn }
  };
}
test('grouped dependencies preserve five responsibility ports', () => {
  const ports = createOrdinaryDragPorts(valid());
  assert.deepEqual(Object.keys(ports), ['state', 'source', 'presentation', 'policy', 'lifecycle']);
  assert.equal(ports.source.viewId, 'equation');
  assert.equal(ports.presentation.feedback.isPointInPreview, fn);
  assert.equal(ports.lifecycle.finishDrag, fn);
});
test('grouped port records are immutable', () => {
  const ports = createOrdinaryDragPorts(valid());
  assert.ok(Object.isFrozen(ports));
  for (const port of Object.values(ports)) assert.ok(Object.isFrozen(port));
  assert.ok(Object.isFrozen(ports.presentation.feedback));
  assert.throws(() => { ports.source.viewId = 'foreign'; }, TypeError);
});
test('missing source and presentation dependencies fail closed', () => {
  const a = valid(); delete a.source.getSourceStamp;
  assert.throws(() => createOrdinaryDragPorts(a), /source port/);
  const b = valid(); delete b.presentation.createGhost;
  assert.throws(() => createOrdinaryDragPorts(b), /presentation port/);
});
test('missing lifecycle and feedback dependencies fail closed', () => {
  const a = valid(); delete a.lifecycle.finishDrag;
  assert.throws(() => createOrdinaryDragPorts(a), /lifecycle port/);
  const b = valid(); delete b.presentation.feedback.isPointInPreview;
  assert.throws(() => createOrdinaryDragPorts(b), /feedback port/);
});
test('production controller rejects legacy flat pickup and movement configuration', () => {
  const grouped = valid();
  assert.equal(typeof createOrdinaryDragController(grouped).pickup, 'function');
  assert.throws(() => createOrdinaryDragController({
    state: grouped.state, pickup: {}, movement: {}
  }), /source port/);
});

test('port snapshot excludes unrecognised caller callbacks', () => {
  const config = valid();
  config.source.unapprovedHook = fn;
  config.presentation.unapprovedHook = fn;
  config.lifecycle.unapprovedHook = fn;
  const ports = createOrdinaryDragPorts(config);
  assert.equal('unapprovedHook' in ports.source, false);
  assert.equal('unapprovedHook' in ports.presentation, false);
  assert.equal('unapprovedHook' in ports.lifecycle, false);
});

test('grouped port construction does not mutate caller-owned configuration', () => {
  const config = valid();
  const originalSource = config.source;
  const originalFeedback = config.presentation.feedback;
  const ports = createOrdinaryDragPorts(config);
  assert.equal(config.source, originalSource);
  assert.equal(config.presentation.feedback, originalFeedback);
  assert.equal(Object.isFrozen(originalSource), false);
  assert.equal(Object.isFrozen(originalFeedback), false);
  assert.notEqual(ports.source, originalSource);
  assert.notEqual(ports.presentation.feedback, originalFeedback);
});
