import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrdinaryDragController } from '../../../js/view/drag/ordinaryDragController.js';

function fixture() {
  const calls = [];
  let drag = null;
  const root = { id: 'sum', type: 'Add', operands: [{ id: 'a' }, { id: 'b' }] };
  const hitbox = { id: 'hitbox' };
  const controller = createOrdinaryDragController({
    state: { getDrag: () => drag, publishDrag: (value) => { drag = value; calls.push('pickup'); } },
    source: {
      resolver: {}, viewId: 'view', getObjectId: () => 'obj',
      getExpressionRoot: () => root,
      getSourceStamp: () => ({ objectId: 'obj', revision: 1 }),
      getRenderGeneration: () => 1,
      locateNode: () => ({ node: root.operands[0], parent: root, index: 0 }),
      createSession: () => ({ id: 'session' })
    },
    presentation: {
      createGhost: () => ({ rect: { left: 0, top: 0 }, ghost: { remove() {} } }),
      captureGeometry: () => ({}), positionGhost: () => {},
      feedback: { settleForRelease: () => null, isPointInPreview: () => false },
      isInsideEquation: () => true
    },
    policy: { canStart: () => drag === null },
    lifecycle: {
      updateTarget: () => calls.push('move'),
      finishDrag: (allowed) => { calls.push(allowed ? 'confirm' : 'cancel'); drag = null; },
      cancelDrag: () => { calls.push('abandon'); drag = null; }
    }
  });
  return { controller, calls, hitbox, getDrag: () => drag };
}

test('unified controller exposes the complete lifecycle with one identity', () => {
  const { controller } = fixture();
  assert.deepEqual(Object.keys(controller).sort(), ['abandon', 'cancel', 'move', 'pickup', 'release'].sort());
  assert.equal(Object.isFrozen(controller), true);
});

test('unified controller ignores movement before pickup and unrelated pointers', () => {
  const { controller, calls } = fixture();
  assert.equal(controller.move({ pointerId: 3 }), false);
  assert.equal(controller.release({ pointerId: 3 }), false);
  assert.equal(controller.cancel({ pointerId: 3 }), false);
  assert.equal(controller.abandon(), false);
  assert.deepEqual(calls, []);
});

test('unified controller validates required dependencies for both lifecycle halves', () => {
  assert.throws(() => createOrdinaryDragController({ source: {}, presentation: {}, policy: {}, lifecycle: {} }), TypeError);
});
