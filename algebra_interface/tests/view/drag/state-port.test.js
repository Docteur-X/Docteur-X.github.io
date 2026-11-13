import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrdinaryDragController } from '../../../js/view/drag/ordinaryDragController.js';

function harness() {
  let drag = null;
  const node = { id: 'a' };
  const root = { id: 'sum', type: 'Add', operands: [node, { id: 'b' }] };
  const hitbox = { dataset: { nodeId: 'a' } };
  const calls = [];
  const controller = createOrdinaryDragController({
    state: { getDrag: () => drag, publishDrag: (value) => { drag = value; } },
    source: {
      resolver: { addressFromElement: () => ({ role: 'occurrence', mathematicalObjectId: 'obj', nodeId: 'a' }), resolve: () => ({ outcome: 'found', elements: [hitbox] }) },
      viewId: 'v', getObjectId: () => 'obj', getExpressionRoot: () => root,
      getSourceStamp: () => ({ objectId: 'obj', revision: 1 }),
      getRenderGeneration: () => 1, locateNode: () => ({ node, parent: root, index: 0 }),
      createSession: (value) => value
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
      finishDrag: (allowed) => { calls.push(['finish', allowed]); drag = null; },
      cancelDrag: () => { calls.push('abandon'); drag = null; }
    }
  });
  return { controller, hitbox, calls, getDrag: () => drag };
}
const event = () => ({ button: 0, pointerId: 7, pointerType: 'mouse', clientX: 10, clientY: 20, preventDefault() {} });

test('shared state port drives pickup and subsequent movement', () => {
  const h = harness();
  assert.equal(h.controller.pickup(event(), h.hitbox), true);
  assert.equal(h.getDrag().item.id, 'a');
  assert.equal(h.controller.move(event()), true);
  assert.deepEqual(h.calls, ['move']);
});

test('shared state port supports release and clears the session', () => {
  const h = harness();
  h.controller.pickup(event(), h.hitbox);
  assert.equal(h.controller.release(event()), true);
  assert.equal(h.getDrag(), null);
  assert.deepEqual(h.calls, ['move', ['finish', true]]);
});

test('shared state port rejects incomplete adapters', () => {
  assert.throws(() => createOrdinaryDragController({ source: {}, presentation: {}, policy: {}, lifecycle: {}, state: { getDrag() {} } }), /state port/);
});
