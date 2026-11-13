/**
 * Authoritative dependency contract for the ordinary drag lifecycle.
 *
 * Every collaborator is grouped by responsibility at the composition root.
 * Only these grouped ports are accepted: no loose pickup/movement settings. The returned
 * shallow-frozen records prevent accidental reassignment of dependency ports;
 * they do not freeze the mutable application state behind callback closures.
 */
export function createOrdinaryDragPorts(config = {}) {
  const requireFunctions = (owner, names, label) => {
    if (!owner || names.some((name) => typeof owner[name] !== 'function')) {
      throw new TypeError(`Ordinary drag ${label} port is incomplete`);
    }
  };
  const { state, source, presentation, policy, lifecycle } = config;
  requireFunctions(state, ['getDrag', 'publishDrag'], 'state');
  requireFunctions(source, ['getObjectId', 'getExpressionRoot', 'getSourceStamp',
    'getRenderGeneration', 'locateNode', 'createSession'], 'source');
  if (!source.resolver || !source.viewId) {
    throw new TypeError('Ordinary drag source port is incomplete');
  }
  requireFunctions(presentation, ['createGhost', 'captureGeometry',
    'positionGhost', 'isInsideEquation'], 'presentation');
  requireFunctions(presentation.feedback, ['settleForRelease',
    'isPointInPreview'], 'feedback');
  requireFunctions(policy, ['canStart'], 'policy');
  requireFunctions(lifecycle, ['updateTarget', 'finishDrag', 'cancelDrag'], 'lifecycle');
  // Only expose the declared contract, not arbitrary caller-owned fields.
  return Object.freeze({
    state: Object.freeze({ getDrag: state.getDrag, publishDrag: state.publishDrag }),
    source: Object.freeze({ resolver: source.resolver, viewId: source.viewId,
      getObjectId: source.getObjectId, getExpressionRoot: source.getExpressionRoot,
      getSourceStamp: source.getSourceStamp, getRenderGeneration: source.getRenderGeneration,
      locateNode: source.locateNode, createSession: source.createSession }),
    presentation: Object.freeze({ createGhost: presentation.createGhost,
      captureGeometry: presentation.captureGeometry, positionGhost: presentation.positionGhost,
      isInsideEquation: presentation.isInsideEquation,
      feedback: Object.freeze({ settleForRelease: presentation.feedback.settleForRelease,
        isPointInPreview: presentation.feedback.isPointInPreview }) }),
    policy: Object.freeze({ canStart: policy.canStart }),
    lifecycle: Object.freeze({ updateTarget: lifecycle.updateTarget,
      finishDrag: lifecycle.finishDrag, cancelDrag: lifecycle.cancelDrag })
  });
}
