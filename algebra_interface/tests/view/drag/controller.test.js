import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrdinaryDragController } from '../../../js/view/drag/ordinaryDragController.js';

function pickupDeps() {
  return { resolver: {}, viewId: 'v', ...Object.fromEntries(['getObjectId','getExpressionRoot','getSourceStamp','getRenderGeneration','locateNode','createGhost','createSession','captureGeometry','positionGhost','canStart'].map(k => [k, () => null])) };
}

function setup() {
  const calls = [];
  let drag = { pointerId: 3, activeTarget: { kind: 'none' }, requestedTarget: { kind: 'insert', index: 1 }, geometry: {}, plansBySumId: new Map() };
  const controller = createOrdinaryDragController({ state: { getDrag: () => drag, publishDrag: () => {} }, ...(() => {
      const p = pickupDeps();
      const m = {
    updateTarget: () => calls.push('update'),
    feedback: { settleForRelease: (target) => { calls.push('settle'); return target; }, isPointInPreview: () => true },
    isInsideEquation: () => false,
    finishDrag: (allowed) => calls.push(['finish', allowed]),
    cancelDrag: (quiet) => calls.push(['cancel', quiet])
  };
      return {
        source: { resolver: p.resolver, viewId: p.viewId, getObjectId: p.getObjectId, getExpressionRoot: p.getExpressionRoot, getSourceStamp: p.getSourceStamp, getRenderGeneration: p.getRenderGeneration, locateNode: p.locateNode, createSession: p.createSession },
        presentation: { createGhost: p.createGhost, captureGeometry: p.captureGeometry, positionGhost: p.positionGhost, feedback: m.feedback, isInsideEquation: m.isInsideEquation },
        policy: { canStart: p.canStart },
        lifecycle: { updateTarget: m.updateTarget, finishDrag: m.finishDrag, cancelDrag: m.cancelDrag }
      };
    })()});
  return { controller, calls, setDrag: (next) => { drag = next; } };
}

test('ordinary drag controller ignores unrelated pointers', () => {
  const { controller, calls } = setup();
  assert.equal(controller.move({pointerId: 4}), false);
  assert.equal(controller.release({pointerId: 4}), false);
  assert.equal(controller.cancel({pointerId: 4}), false);
  assert.deepEqual(calls, []);
});

test('release refreshes and settles a target before finishing', () => {
  const { controller, calls } = setup();
  assert.equal(controller.release({pointerId: 3, clientX: 0, clientY: 0}), true);
  assert.deepEqual(calls, ['update', 'settle', ['finish', true]]);
});

test('pointer cancel never commits; abandonment cancels without commit', () => {
  const { controller, calls } = setup();
  assert.equal(controller.cancel({pointerId: 3}), true);
  assert.equal(controller.abandon(), true);
  assert.deepEqual(calls, [['finish', false], ['cancel', false]]);
});

test('release does not settle a session invalidated during final update', () => {
  let drag = { pointerId: 3 };
  const calls = [];
  const controller = createOrdinaryDragController({ state: { getDrag: () => drag, publishDrag: () => {} }, ...(() => {
      const p = pickupDeps();
      const m = {
    updateTarget: () => { drag = null; },
    feedback: { settleForRelease: () => { calls.push('settle'); }, isPointInPreview: () => false },
    isInsideEquation: () => false,
    finishDrag: () => calls.push('finish'),
    cancelDrag: () => calls.push('cancel')
  };
      return {
        source: { resolver: p.resolver, viewId: p.viewId, getObjectId: p.getObjectId, getExpressionRoot: p.getExpressionRoot, getSourceStamp: p.getSourceStamp, getRenderGeneration: p.getRenderGeneration, locateNode: p.locateNode, createSession: p.createSession },
        presentation: { createGhost: p.createGhost, captureGeometry: p.captureGeometry, positionGhost: p.positionGhost, feedback: m.feedback, isInsideEquation: m.isInsideEquation },
        policy: { canStart: p.canStart },
        lifecycle: { updateTarget: m.updateTarget, finishDrag: m.finishDrag, cancelDrag: m.cancelDrag }
      };
    })()});
  assert.equal(controller.release({pointerId: 3}), true);
  assert.deepEqual(calls, []);
});
