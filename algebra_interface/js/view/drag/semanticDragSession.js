/**
 * View-local semantic drag identity and freshness contract.
 *
 * This module owns no DOM, geometry, algebraic permission or mutable AST.
 * The host supplies a source stamp and render generation at pickup and again
 * before processing movement or release. A new render generation invalidates
 * the gesture even when the same node IDs are still present: its hit-test
 * rectangles and source element belonged to the previous representation.
 *
 * The source stamp deliberately retains a fingerprint: history revision alone
 * cannot detect every in-place change made between renders.
 */
const STAMP_KEYS = Object.freeze(['documentId', 'objectId', 'revision', 'rootId', 'fingerprint']);
let nextSessionId = 0;

export function createSemanticDragSession({ viewId, source, parentId, pointerId, renderGeneration, sourceStamp } = {}) {
  if (typeof viewId !== 'string' || !viewId || typeof source !== 'string' || !source ||
      typeof parentId !== 'string' || !parentId || !Number.isInteger(pointerId) ||
      !Number.isSafeInteger(renderGeneration) || renderGeneration < 0 ||
      !sourceStamp || typeof sourceStamp !== 'object') throw new TypeError('Invalid drag session source');
  for (const key of STAMP_KEYS) if (!(key in sourceStamp)) throw new TypeError(`Missing source stamp: ${key}`);
  const stamp = Object.freeze(Object.fromEntries(STAMP_KEYS.map(key => [key, sourceStamp[key]])));
  return Object.freeze({ kind: 'semantic-drag-session', id: `drag-${++nextSessionId}`,
    viewId, source: Object.freeze({ nodeId: source, role: 'occurrence' }), parentId,
    pointerId, renderGeneration, sourceStamp: stamp });
}

/** Pure check; returns a reason for diagnostic logging and targeted tests. */
export function checkSemanticDragSession(session, { viewId, pointerId, renderGeneration, sourceStamp } = {}) {
  if (session?.kind !== 'semantic-drag-session') return 'no-session';
  if (session.viewId !== viewId) return 'different-view';
  if (session.pointerId !== pointerId) return 'different-pointer';
  if (session.renderGeneration !== renderGeneration) return 'stale-render';
  if (!sourceStamp || STAMP_KEYS.some(key => session.sourceStamp[key] !== sourceStamp[key])) return 'stale-source';
  return null;
}
