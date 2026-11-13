/** Regression tests: synchronous callbacks must not resurrect stale pickup. */
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

function fixture(hook = () => {}) {
  let active = null;
  let generation = 1;
  let objectId = 'obj';
  let revision = 1;
  let removed = 0;
  let published = 0;
  let prevented = 0;
  const hitbox = { dataset: { nodeId: 'a' } };
  const root = { id: 'sum', type: 'Add', operands: [{ id: 'a' }, { id: 'b' }] };
  const context = {
    replaceDrag: value => { active = value; },
    changeGeneration: () => { generation++; },
    changeObject: () => { objectId = 'other'; },
    changeRevision: () => { revision++; }
  };
  const controller = createOrdinaryDragController({
    state: {
      getDrag: () => active,
      publishDrag: drag => { published++; active = drag; }
    },
    ...groupPickupAndMovement({ pickup: {
      resolver: {
        addressFromElement: () => ({ role: 'occurrence', mathematicalObjectId: 'obj', nodeId: 'a' }),
        resolve: () => ({ outcome: 'found', elements: [hitbox] })
      },
      viewId: 'view', getObjectId: () => objectId,
      getExpressionRoot: () => root,
      getSourceStamp: () => ({ objectId: 'obj', revision }),
      getRenderGeneration: () => generation,
      locateNode: () => ({ node: root.operands[0], parent: root, index: 0 }),
      createSession: () => ({}),
      createGhost: () => ({ rect: { left: 0, top: 0 }, ghost: { remove: () => { removed++; } } }),
      captureGeometry: () => { hook(context); return {}; },
      positionGhost: () => {},
      canStart: () => true
    },
    movement: {
      updateTarget: () => {},
      feedback: { settleForRelease: () => null, isPointInPreview: () => false },
      isInsideEquation: () => false, finishDrag: () => {}, cancelDrag: () => {}
    } })
  });
  return {
    pickup: () => controller.pickup({ button: 0, pointerId: 1, clientX: 5, clientY: 5,
      preventDefault: () => { prevented++; } }, hitbox),
    get active() { return active; },
    get removed() { return removed; },
    get published() { return published; },
    get prevented() { return prevented; }
  };
}

test('pickup cannot overwrite a drag published during geometry measurement', () => {
  const other = { pointerId: 9 };
  const h = fixture(ctx => ctx.replaceDrag(other));
  assert.equal(h.pickup(), false);
  assert.equal(h.active, other);
  assert.equal(h.published, 0);
  assert.equal(h.removed, 1);
  assert.equal(h.prevented, 0);
});

test('pickup rejects render invalidation during geometry measurement', () => {
  const h = fixture(ctx => ctx.changeGeneration());
  assert.equal(h.pickup(), false);
  assert.equal(h.active, null);
  assert.equal(h.removed, 1);
  assert.equal(h.published, 0);
});

test('pickup rejects object replacement during geometry measurement', () => {
  const h = fixture(ctx => ctx.changeObject());
  assert.equal(h.pickup(), false);
  assert.equal(h.active, null);
  assert.equal(h.removed, 1);
});

test('unchanged pickup publishes once and prevents the native event', () => {
  const h = fixture();
  assert.equal(h.pickup(), true);
  assert.equal(h.published, 1);
  assert.equal(h.removed, 0);
  assert.equal(h.prevented, 1);
});

test('pickup rejects source revision changes during geometry measurement', () => {
  const h = fixture(ctx => ctx.changeRevision());
  assert.equal(h.pickup(), false);
  assert.equal(h.active, null);
  assert.equal(h.removed, 1);
});
