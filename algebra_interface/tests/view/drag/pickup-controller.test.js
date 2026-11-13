import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrdinaryDragController as createUnifiedDragController } from '../../../js/view/drag/ordinaryDragController.js';

function createOrdinaryDragController(pickup) {
  return createUnifiedDragController({
    state: { getDrag: () => null, publishDrag: pickup.publishDrag },
    source: { resolver: pickup.resolver, viewId: pickup.viewId, getObjectId: pickup.getObjectId,
      getExpressionRoot: pickup.getExpressionRoot, getSourceStamp: pickup.getSourceStamp,
      getRenderGeneration: pickup.getRenderGeneration, locateNode: pickup.locateNode,
      createSession: pickup.createSession },
    presentation: { createGhost: pickup.createGhost, captureGeometry: pickup.captureGeometry,
      positionGhost: pickup.positionGhost, isInsideEquation: () => false,
      feedback: { settleForRelease: () => null, isPointInPreview: () => false } },
    policy: { canStart: pickup.canStart },
    lifecycle: { updateTarget: () => {}, finishDrag: () => {}, cancelDrag: () => {} }
  });
}

function harness(overrides = {}) {
  const hitbox = { dataset: { nodeId: 'term' } };
  const ghost = { removed: false, remove() { this.removed = true; } };
  let published = null;
  let prevented = false;
  const deps = {
    resolver: {
      addressFromElement: () => ({ role: 'occurrence', mathematicalObjectId: 'obj', nodeId: 'term' }),
      resolve: () => ({ outcome: 'found', elements: [hitbox] })
    },
    viewId: 'view', getObjectId: () => 'obj',
    getExpressionRoot: () => ({}), getSourceStamp: () => ({ objectId: 'obj', revision: 1 }),
    getRenderGeneration: () => 3,
    locateNode: () => ({ node: { id: 'term' }, parent: { id: 'sum', type: 'Add', operands: [{ id: 'term' }] }, index: 0 }),
    createGhost: () => ({ rect: { left: 10, top: 20 }, ghost }),
    createSession: (args) => Object.freeze(args),
    captureGeometry: () => ({ targets: [] }), positionGhost: () => {},
    canStart: () => true, publishDrag: (drag) => { published = drag; },
    ...overrides
  };
  const event = { button: 0, pointerId: 7, pointerType: 'mouse', clientX: 30, clientY: 40,
    preventDefault() { prevented = true; } };
  return { controller: createOrdinaryDragController(deps), hitbox, event, ghost,
    get published() { return published; }, get prevented() { return prevented; } };
}

test('pickup publishes a semantic session and complete drag only after validation', () => {
  const h = harness();
  assert.equal(h.controller.pickup(h.event, h.hitbox), true);
  assert.equal(h.published.parentId, 'sum');
  assert.equal(h.published.semanticSession.renderGeneration, 3);
  assert.equal(h.published.offsetX, 20);
  assert.equal(h.prevented, true);
});

test('pickup rejects foreign/stale semantic targets without publishing', () => {
  const h = harness({ resolver: { addressFromElement: () => null } });
  assert.equal(h.controller.pickup(h.event, h.hitbox), false);
  assert.equal(h.published, null);
  assert.equal(h.prevented, false);
});

test('pickup rejects non-associative parents', () => {
  const h = harness({ locateNode: () => ({ node: { id: 'term' }, parent: { id: 'root', type: 'Group' } }) });
  assert.equal(h.controller.pickup(h.event, h.hitbox), false);
  assert.equal(h.published, null);
});

test('geometry failure removes ghost and does not publish drag', () => {
  const h = harness({ captureGeometry: () => { throw new Error('measurement failed'); } });
  assert.throws(() => h.controller.pickup(h.event, h.hitbox), /measurement failed/);
  assert.equal(h.ghost.removed, true);
  assert.equal(h.published, null);
});
