import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrdinaryDragController } from '../../../js/view/drag/ordinaryDragController.js';

function harness(initialDrag = null, allowed = true) {
  let drag = initialDrag;
  let semanticLookups = 0;
  const hitbox = { dataset: { nodeId: 'a' } };
  const root = { id: 'sum', type: 'Add', operands: [{ id: 'a' }, { id: 'b' }] };
  const controller = createOrdinaryDragController({
    state: { getDrag: () => drag, publishDrag: value => { drag = value; } },
    source: {
      resolver: {
        addressFromElement: () => { semanticLookups++; return { role: 'occurrence', mathematicalObjectId: 'obj', nodeId: 'a' }; },
        resolve: () => ({ outcome: 'found', elements: [hitbox] })
      },
      viewId: 'view', getObjectId: () => 'obj', getExpressionRoot: () => root,
      getSourceStamp: () => ({ objectId: 'obj', revision: 1 }),
      getRenderGeneration: () => 1,
      locateNode: () => ({ node: root.operands[0], parent: root, index: 0 }),
      createSession: () => ({})
    },
    presentation: {
      createGhost: () => ({ rect: { left: 0, top: 0 }, ghost: { remove() {} } }),
      captureGeometry: () => ({}), positionGhost: () => {},
      feedback: { settleForRelease: () => null, isPointInPreview: () => false },
      isInsideEquation: () => false
    },
    policy: { canStart: () => allowed },
    lifecycle: { updateTarget: () => {}, finishDrag: () => {}, cancelDrag: () => {} }
  });
  const event = { button: 0, pointerId: 1, clientX: 5, clientY: 5, preventDefault() {} };
  return { controller, event, hitbox, get drag() { return drag; }, get semanticLookups() { return semanticLookups; } };
}

test('authoritative state prevents pickup from replacing an active drag', () => {
  const existing = { pointerId: 99 };
  const h = harness(existing);
  assert.equal(h.controller.pickup(h.event, h.hitbox), false);
  assert.equal(h.drag, existing);
  assert.equal(h.semanticLookups, 0);
});

test('pickup cannot overwrite its own newly published session', () => {
  const h = harness();
  assert.equal(h.controller.pickup(h.event, h.hitbox), true);
  const first = h.drag;
  assert.equal(h.controller.pickup(h.event, h.hitbox), false);
  assert.equal(h.drag, first);
  assert.equal(h.semanticLookups, 1);
});

test('feature-specific modal guard still blocks pickup when no drag exists', () => {
  const h = harness(null, false);
  assert.equal(h.controller.pickup(h.event, h.hitbox), false);
  assert.equal(h.drag, null);
  assert.equal(h.semanticLookups, 0);
});
