import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrdinaryDragController } from '../../../js/view/drag/ordinaryDragController.js';

function fixture(state, extra = {}) {
  const pickup = {
    resolver: {}, viewId: 'view', getObjectId: () => 'obj',
    getExpressionRoot: () => ({}), getSourceStamp: () => ({ objectId: 'obj' }),
    getRenderGeneration: () => 1, locateNode: () => null,
    createGhost: () => null, createSession: () => null,
    captureGeometry: () => null, positionGhost: () => {}, canStart: () => true,
    ...extra.pickup
  };
  const movement = {
    updateTarget: () => {}, feedback: {
      settleForRelease: () => null, isPointInPreview: () => false
    }, isInsideEquation: () => false, finishDrag: () => {}, cancelDrag: () => {},
    ...extra.movement
  };
  return createOrdinaryDragController({
    state,
    source: { resolver: pickup.resolver, viewId: pickup.viewId,
      getObjectId: pickup.getObjectId, getExpressionRoot: pickup.getExpressionRoot,
      getSourceStamp: pickup.getSourceStamp, getRenderGeneration: pickup.getRenderGeneration,
      locateNode: pickup.locateNode, createSession: pickup.createSession },
    presentation: { createGhost: pickup.createGhost, captureGeometry: pickup.captureGeometry,
      positionGhost: pickup.positionGhost, feedback: movement.feedback,
      isInsideEquation: movement.isInsideEquation },
    policy: { canStart: pickup.canStart },
    lifecycle: { updateTarget: movement.updateTarget, finishDrag: movement.finishDrag,
      cancelDrag: movement.cancelDrag }
  });
}

test('single state port is mandatory even when legacy callbacks are supplied', () => {
  assert.throws(() => fixture(undefined, {
    pickup: { publishDrag() {} }, movement: { getDrag() { return null; } }
  }), /state port/);
});

test('incomplete shared state port fails before composing lifecycle', () => {
  assert.throws(() => fixture({ getDrag: () => null }), /state port/);
  assert.throws(() => fixture({ publishDrag() {} }), /state port/);
});

test('movement reads authoritative state port rather than legacy callback', () => {
  const drag = { pointerId: 7 };
  const controller = fixture({ getDrag: () => drag, publishDrag() {} }, {
    movement: { getDrag: () => null }
  });
  assert.equal(controller.move({ pointerId: 7 }), true);
  assert.equal(controller.move({ pointerId: 8 }), false);
});
