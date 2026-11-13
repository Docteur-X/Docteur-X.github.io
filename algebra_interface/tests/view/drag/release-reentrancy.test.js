import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrdinaryDragController } from '../../../js/view/drag/ordinaryDragController.js';

/** Group a test's scenario-specific collaborators into production dependency ports. */
function groupPickupAndMovement({ pickup: p, movement: m }) {
  return {
    source: { resolver: p.resolver, viewId: p.viewId, getObjectId: p.getObjectId,
      getExpressionRoot: p.getExpressionRoot, getSourceStamp: p.getSourceStamp,
      getRenderGeneration: p.getRenderGeneration, locateNode: p.locateNode,
      createSession: p.createSession },
    presentation: { createGhost: p.createGhost, captureGeometry: p.captureGeometry,
      positionGhost: p.positionGhost, isInsideEquation: m.isInsideEquation, feedback: m.feedback },
    policy: { canStart: p.canStart },
    lifecycle: { updateTarget: m.updateTarget, finishDrag: m.finishDrag, cancelDrag: m.cancelDrag }
  };
}

function fixture(invalidateAt) {
  let drag = { pointerId: 4, requestedTarget: { kind: 'insert' }, activeTarget: { kind: 'none' }, geometry: {} };
  const original = drag;
  const commits = [];
  const controller = createOrdinaryDragController({
    state: { getDrag: () => drag, publishDrag: value => { drag = value; } },
    ...groupPickupAndMovement({ pickup: { resolver: {}, viewId: 'view', getObjectId() {}, getExpressionRoot() {},
      getSourceStamp() {}, getRenderGeneration() {}, locateNode() {},
      createGhost() {}, createSession() {}, captureGeometry() {}, positionGhost() {},
      canStart: () => true },
    movement: {
      updateTarget: () => {},
      feedback: {
        settleForRelease: () => {
          if (invalidateAt === 'settle') drag = null;
          return { kind: 'insert', index: 1 };
        },
        isPointInPreview: () => {
          if (invalidateAt === 'preview') drag = null;
          return true;
        }
      },
      isInsideEquation: () => false,
      finishDrag: allowed => commits.push(allowed),
      cancelDrag: () => { drag = null; }
    } })
  });
  return { controller, original, commits, getDrag: () => drag };
}

test('release never applies settled feedback to a synchronously invalidated session', () => {
  const h = fixture('settle');
  assert.equal(h.controller.release({ pointerId: 4, clientX: 0, clientY: 0 }), true);
  assert.deepEqual(h.original.activeTarget, { kind: 'none' });
  assert.deepEqual(h.commits, []);
});

test('release never commits after preview hit testing invalidates its session', () => {
  const h = fixture('preview');
  assert.equal(h.controller.release({ pointerId: 4, clientX: 0, clientY: 0 }), true);
  assert.deepEqual(h.commits, []);
});

test('release still finishes an uninterrupted valid session', () => {
  const h = fixture(null);
  assert.equal(h.controller.release({ pointerId: 4, clientX: 0, clientY: 0 }), true);
  assert.deepEqual(h.commits, [true]);
});
