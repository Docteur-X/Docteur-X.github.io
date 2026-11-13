import { isRelationNode } from '../../engine/nodeRegistry.js';
import { sameOrdinaryDragSourceStamp } from './ordinaryDragSourceStamp.js';
import { createOrdinaryDragPorts } from './ordinaryDragPorts.js';
import { decideOrdinaryDragRelease } from './ordinaryDragReleaseDecision.js';
/**
 * One ordinary-drag lifecycle facade.
 *
 * Pickup and pointer progression share one public controller and are composed
 * once by app.js. The existing mathematical source of truth remains app state:
 * this migration intentionally does not introduce a second drag state store.
 *
 * The two private helpers keep pickup and release concerns readable. Later
 * migration may transfer state ownership only after a dedicated revision and
 * modal-interaction contract has been established.
 */
/**
 * Ordinary drag pickup coordinator.
 *
 * Translates a renderer-declared draggable hitbox into a semantic AST
 * occurrence, checks that it belongs to an associative parent, then creates
 * a view-bound drag session and its presentation-only ghost. This module
 * deliberately does not determine drop eligibility or perform mathematics.
 *
 * All dependencies are injected to keep document ownership and modal state
 * in the application composition layer. No state is published until semantic
 * validation and ghost creation succeed. A failed geometry capture cleans up
 * the ghost and never leaves a half-initialised drag session behind.
 */
import { resolveOrdinaryDragPickup } from './ordinaryDragPickup.js';
import { isTermSequence } from '../../definitions/operators/presentation.js';

function createPickup(deps) {
  const required = ['getObjectId', 'getExpressionRoot', 'getSourceStamp',
    'getRenderGeneration', 'locateNode', 'createGhost', 'createSession',
    'captureGeometry', 'positionGhost', 'canStart', 'publishDrag'];
  if (!deps?.resolver || !deps.viewId ||
      required.some((name) => typeof deps[name] !== 'function')) {
    throw new TypeError('Ordinary drag pickup controller requires complete dependencies');
  }
  let sequence = 0;

  function pickup(event, hitbox) {
    if (!event || event.button !== 0 || !deps.canStart()) return false;
    const objectId = deps.getObjectId();
    const address = resolveOrdinaryDragPickup({
      hitbox, resolver: deps.resolver, mathematicalObjectId: objectId
    });
    if (!address) return false;
    const location = deps.locateNode(deps.getExpressionRoot(), address.nodeId);
    // A term of a sum or product, or a whole side of an equation (stage 7
    // follow-up: e.g. the x of x = 2y+3, for the both-sides rule). A side has
    // no siblings to reorder; only rule-owned targets apply to it.
    const isSide = isRelationNode(location?.parent);
    if (!location?.parent || (!isSide && (!isTermSequence(location.parent) ||
        !Array.isArray(location.parent.operands)))) return false;

    const sourceStamp = deps.getSourceStamp();
    const renderGeneration = deps.getRenderGeneration();
    const session = deps.createSession({
      viewId: deps.viewId, source: location.node.id, parentId: location.parent.id,
      pointerId: event.pointerId, renderGeneration,
      sourceStamp
    });
    // Preparing the ghost and measuring geometry can invoke application hooks.
    // Such hooks may synchronously open a modal preview, tear down the view, or
    // even publish a different drag. Pickup must re-check exclusivity *after*
    // those callbacks, not just before resolving the semantic source.
    const { rect, ghost } = deps.createGhost(hitbox);
    let drag;
    try {
      drag = {
        arbitrationSessionToken: `ordinary-${++sequence}`,
        semanticSession: session,
        arbitrationViewId: deps.viewId,
        arbitrationObjectId: sourceStamp.objectId ?? 'standalone-mathematical-object',
        arbitrationSourceStamp: sourceStamp,
        item: location.node,
        parentId: location.parent.id,
        parentType: location.parent.type,
        startIndex: location.index,
        originalOrder: isSide ? [location.node.id] : location.parent.operands.map((child) => child.id),
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        ghost,
        sourceElement: hitbox,
        startClientX: event.clientX,
        startClientY: event.clientY,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
        moved: false,
        activeTarget: { kind: 'none' },
        requestedTarget: { kind: 'none' },
        invalidTarget: false,
        distributionPlan: null
      };
      drag.geometry = deps.captureGeometry(drag);
      deps.positionGhost(event.clientX, event.clientY, drag);
      // A cancelled or superseded pickup must never overwrite another session.
      // Recheck source freshness as well as the policy gate: the callbacks above
      // are not guaranteed to be free of synchronous application side effects.
      const currentStamp = deps.getSourceStamp();
      if (!deps.canStart() ||
          deps.getObjectId() !== objectId ||
          deps.getRenderGeneration() !== renderGeneration ||
          !sameOrdinaryDragSourceStamp(sourceStamp, currentStamp)) {
        ghost?.remove?.();
        return false;
      }
      deps.publishDrag(drag);
    } catch (error) {
      ghost?.remove?.();
      throw error;
    }
    event.preventDefault();
    return true;
  }
  return Object.freeze({ pickup });
}

/**
 * Ordinary operand drag event coordinator.
 *
 * This module owns browser-event routing, not mathematics or rendering.
 * Dependencies are deliberately injected so rule eligibility, visual feedback,
 * history and preview state remain with their existing owners during migration.
 *
 * A pointer release must refresh its target at the release coordinates: some
 * devices do not deliver a final pointermove. The settled target is the only
 * target eligible for the subsequent commit/preview operation.
 */
function createMovement({
  getDrag, updateTarget, feedback, isInsideEquation, finishDrag, cancelDrag
}) {
  if (![getDrag, updateTarget, isInsideEquation, finishDrag, cancelDrag]
    .every((dependency) => typeof dependency === 'function') ||
    typeof feedback?.settleForRelease !== 'function' ||
    typeof feedback?.isPointInPreview !== 'function') {
    throw new TypeError('Ordinary drag controller requires complete event and feedback dependencies');
  }

  function move(event) {
    const drag = getDrag();
    if (!drag || drag.pointerId !== event.pointerId) return false;
    updateTarget(event);
    return true;
  }

  function release(event) {
    const drag = getDrag();
    if (!drag || drag.pointerId !== event.pointerId) return false;
    updateTarget(event);
    // updateTarget can invalidate the session and clear the drag. Never
    // resurrect that cancelled session by settling its old target.
    const current = getDrag();
    if (!current || current !== drag) return true;
    const requested = current.requestedTarget;
    const active = current.activeTarget;
    const settled = feedback.settleForRelease(
      requested?.kind === active?.kind ? null : requested,
      current.geometry
    );
    // Feedback is an injected collaborator and may synchronously invalidate the
    // session (for example, a view teardown). Never mutate or settle a drag
    // that is no longer the authoritative session.
    if (getDrag() !== current) return true;
    if (settled) {
      current.activeTarget = settled;
      current.distributionPlan = settled.kind === 'distribution'
        ? current.plansBySumId?.get(settled.id) || null : null;
    }
    // Keep the region decision pure; both measurements may have external
    // effects, so the authoritative session is rechecked before completion.
    const insideEquation = isInsideEquation(event.clientX, event.clientY);
    if (getDrag() !== current) return true;
    const insidePreview = current.activeTarget?.kind === 'insert'
      ? feedback.isPointInPreview(event.clientX, event.clientY) : false;
    const { allowed } = decideOrdinaryDragRelease({
      insideEquation, insidePreview, targetKind: current.activeTarget?.kind ?? 'none'
    });
    // Geometry and preview hit-testing can also trigger a synchronous view
    // change. A stale release must not commit a newer or cancelled session.
    if (getDrag() !== current) return true;
    finishDrag(allowed);
    return true;
  }

  function cancel(event) {
    const drag = getDrag();
    if (!drag || drag.pointerId !== event.pointerId) return false;
    finishDrag(false);
    return true;
  }

  function abandon() {
    if (!getDrag()) return false;
    cancelDrag(false);
    return true;
  }

  return Object.freeze({ move, release, cancel, abandon });
}

/**
 * Assemble the complete lifecycle using one mandatory authoritative state port.
 *
 * No fallback dependency injection is supported: pickup and movement must
 * observe the same drag state. The application remains its sole owner; the
 * controller neither caches a duplicate session nor publishes to another store.
 */
export function createOrdinaryDragController(dependencies = {}) {
  // Validate and group every injected dependency before constructing either
  // half of the lifecycle. The controller still shares application-owned state.
  const ports = createOrdinaryDragPorts(dependencies);
  const { state, source, presentation, policy, lifecycle } = ports;
  const start = createPickup({
    ...source,
    createGhost: presentation.createGhost,
    captureGeometry: presentation.captureGeometry,
    positionGhost: presentation.positionGhost,
    canStart: () => state.getDrag() == null && policy.canStart() === true,
    publishDrag: state.publishDrag
  });
  const progress = createMovement({
    getDrag: state.getDrag,
    updateTarget: lifecycle.updateTarget,
    feedback: presentation.feedback,
    isInsideEquation: presentation.isInsideEquation,
    finishDrag: lifecycle.finishDrag,
    cancelDrag: lifecycle.cancelDrag
  });
  return Object.freeze({ pickup: start.pickup, move: progress.move,
    release: progress.release, cancel: progress.cancel, abandon: progress.abandon });
}
