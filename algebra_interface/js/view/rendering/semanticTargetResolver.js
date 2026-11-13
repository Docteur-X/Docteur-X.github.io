/**
 * Phase 2: view-local, read-only semantic target index.
 *
 * The AST supplies occurrence identity; renderer-emitted data attributes supply
 * its current DOM representation. Neither CSS selector order nor hitbox geometry
 * is mathematical authority. A resolver is bound to ONE view and one MOb ID;
 * a second view of the same object receives an independent resolver.
 *
 * Call refresh after rendering replaces children. Resolving a detached element
 * is never allowed: old references become unavailable until the next refresh.
 */
import { mapMathematicalOccurrences } from './semanticContainerMap.js';

const TARGET_OUTCOMES = Object.freeze({
  FOUND: 'found', CONTENT_ONLY: 'content-only',
  OPERATOR_ONLY: 'operator-only', UNAVAILABLE: 'unavailable',
});

/** Operator indices are renderer boundary positions (1-based for n-ary ops).
 * A unary operator has no boundary index. Malformed indices are rejected
 * instead of silently mapping distinct operator targets to the same address.
 */
function operatorAddress(element, entries) {
  const nodeId = element.dataset.operatorOwnerId;
  const entry = entries.get(nodeId);
  if (!entry) return null;
  const raw = element.dataset.operatorIndex;
  if (raw === undefined || raw === '') return { nodeId, role: 'operator' };
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const operatorPosition = Number(raw);
  if (!Number.isSafeInteger(operatorPosition)) return null;
  return { nodeId, role: 'operator', operatorPosition };
}

export function createSemanticTargetResolver({ view, getRoot, getMathematicalObjectId }) {
  if (!view || typeof view.querySelectorAll !== 'function' || typeof view.contains !== 'function')
    throw new TypeError('A mathematical view is required');
  if (typeof getRoot !== 'function' || typeof getMathematicalObjectId !== 'function')
    throw new TypeError('AST and mathematical object providers are required');
  let objectId = null;
  let entries = new Map();
  let targets = new Map();
  let reverseTargets = new Map();
  let indexedRoot = null;
  let indexedObjectId = null;
  let generation = 0;
  // A semantic hitbox may be reused by DOM code. Capture the exact semantic
  // attributes at indexing time; a later mutation cannot silently retarget it.
  let fingerprints = new Map();
  const fingerprint = element => [
    element.dataset.hitboxRole ?? '', element.dataset.nodeId ?? '',
    element.dataset.parentId ?? '', element.dataset.operatorOwnerId ?? '',
    element.dataset.operatorIndex ?? ''
  ].join('\u0000');
  const isCurrent = element => view.contains(element) &&
    fingerprints.get(element) === fingerprint(element) &&
    getRoot() === indexedRoot && getMathematicalObjectId() === indexedObjectId;
  /** Invalidate BEFORE changing the mounted equation, not just afterwards. */
  function invalidate() {
    generation += 1;
    indexedRoot = null;
    indexedObjectId = null;
    entries = new Map(); targets = new Map(); reverseTargets = new Map();
    fingerprints = new Map();
  }

  function refresh() {
    const nextObjectId = getMathematicalObjectId();
    const root = getRoot();
    const nextEntries = new Map();
    const nextTargets = new Map();
    const nextReverseTargets = new Map();
    const nextFingerprints = new Map();
    if (root) {
      for (const entry of mapMathematicalOccurrences(root)) {
        nextEntries.set(entry.nodeId, entry);
        nextTargets.set(entry.nodeId, { occurrences: [], contents: [], operators: [] });
      }
      // One DOM scan per refresh, rather than one scan per AST occurrence.
      for (const element of view.querySelectorAll('[data-node-id], [data-parent-id], [data-operator-owner-id]')) {
        const role = element.dataset.hitboxRole;
        // Only index renderer-declared semantic roles. A stray data-node-id
        // on an unrelated wrapper must never become mathematical authority.
        const candidate = role === 'occurrence' && nextTargets.has(element.dataset.nodeId)
          ? { nodeId: element.dataset.nodeId, role: 'occurrence' }
          : role === 'content' && nextTargets.has(element.dataset.parentId)
            ? { nodeId: element.dataset.parentId, role: 'content' }
            : element.dataset.operatorOwnerId && nextTargets.has(element.dataset.operatorOwnerId)
              ? operatorAddress(element, nextEntries) : null;
        if (!candidate) continue;
        const bucket = candidate.role === 'occurrence' ? 'occurrences'
          : candidate.role === 'content' ? 'contents' : 'operators';
        nextTargets.get(candidate.nodeId)[bucket].push(element);
        nextReverseTargets.set(element, Object.freeze(candidate));
        nextFingerprints.set(element, fingerprint(element));
      }
    }
    objectId = nextObjectId;
    entries = nextEntries;
    targets = nextTargets;
    reverseTargets = nextReverseTargets;
    fingerprints = nextFingerprints;
    indexedRoot = root;
    indexedObjectId = nextObjectId;
    generation += 1;
  }

  /**
   * `targetRole` is occurrence, content, operator, or preferred (default).
   * `operatorPosition` addresses the renderer's operand-boundary index (first operator = 1).
   * A requested role never silently falls back to a different geometry.
   */
  function resolve({ mathematicalObjectId, nodeId, targetRole = 'preferred', operatorPosition } = {}) {
    const unavailable = () => ({ outcome: TARGET_OUTCOMES.UNAVAILABLE, representation: 'no-direct-target', element: null, elements: [] });
    if (mathematicalObjectId !== objectId || !entries.has(nodeId) ||
        getRoot() !== indexedRoot || getMathematicalObjectId() !== indexedObjectId) return unavailable();
    if (!['preferred', 'occurrence', 'content', 'operator'].includes(targetRole))
      throw new TypeError('Unknown semantic target role');
    const record = targets.get(nodeId);
    const attached = elements => elements.filter(isCurrent);
    const occurrences = attached(record.occurrences);
    const contents = attached(record.contents);
    const operators = attached(record.operators).filter(element => operatorPosition === undefined ||
      Number(element.dataset.operatorIndex) === operatorPosition);
    let selected = [];
    let representation = 'no-direct-target';
    if ((targetRole === 'preferred' || targetRole === 'occurrence') && occurrences.length) {
      selected = occurrences; representation = 'occurrence';
    } else if ((targetRole === 'preferred' || targetRole === 'content') && contents.length) {
      selected = contents; representation = 'content-only';
    } else if ((targetRole === 'preferred' || targetRole === 'operator') && operators.length) {
      selected = operators; representation = 'operator-only';
    }
    return {
      outcome: !selected.length ? TARGET_OUTCOMES.UNAVAILABLE :
        representation === 'occurrence' ? TARGET_OUTCOMES.FOUND : representation,
      representation, element: selected[0] ?? null, elements: [...selected],
    };
  }
  /**
   * Resolve an actual event target (or a descendant inside a hitbox) into the
   * mathematical address declared by the current renderer. No CSS selector
   * matching or coordinate heuristics: only indexed, attached DOM is trusted.
   * The nearest indexed ancestor wins, so nested expressions address the
   * innermost rendered target. Caller must refresh after each rerender.
   *
   * The result deliberately contains no DOM element. It can be passed to the
   * semantic input layer without leaking renderer implementation details.
   */
  function addressFromElement(element, { mathematicalObjectId } = {}) {
    if (mathematicalObjectId !== objectId || !element || !view.contains(element) ||
        getRoot() !== indexedRoot || getMathematicalObjectId() !== indexedObjectId) return null;
    let current = element;
    while (current && current !== view) {
      const address = reverseTargets.get(current);
      if (address) {
        // A mutated inner hitbox must not silently resolve as its outer parent.
        // That would turn a stale interaction into a different mathematical act.
        if (!isCurrent(current)) return null;
        return Object.freeze({ mathematicalObjectId: objectId, ...address });
      }
      current = current.parentElement ?? current.parentNode ?? null;
    }
    return null;
  }

  function describe(nodeId) {
    if (!entries.has(nodeId)) return null;
    const record = targets.get(nodeId);
    const count = list => list.filter(element => view.contains(element)).length;
    const occurrenceTargets = count(record.occurrences);
    const contentContainers = count(record.contents);
    const operatorTargets = count(record.operators);
    return { ...entries.get(nodeId), occurrenceTargets, contentContainers, operatorTargets,
      directlyTargetable: occurrenceTargets > 0,
      representation: resolve({ mathematicalObjectId: objectId, nodeId }).representation };
  }
  return Object.freeze({ invalidate, refresh, resolve, addressFromElement, describe,
    getGeneration: () => generation, getMathematicalObjectId: () => objectId });
}
