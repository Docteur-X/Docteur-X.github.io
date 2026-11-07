/**
 * Branch-aware, snapshot-backed event history.
 *
 * Snapshots remain authoritative for ordinary undo/redo. Every transition also
 * carries a versioned, deterministic data patch, so a future compact-storage
 * adapter can replay it without executing a potentially changed algebra rule.
 * This module knows nothing about DOM elements or mathematical permissions.
 */

export const HISTORY_EVENT_VERSION = 1;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const copy = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Stable (non-cryptographic) fingerprint for detecting accidental replay drift. */
export function snapshotFingerprint(snapshot) {
  const source = JSON.stringify(snapshot);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Build a deterministic JSON data patch. Arrays are replaced atomically when
 * changed: this is safe for reordered operands and retains every existing ID.
 * Unchanged subtrees never appear in the patch.
 */
export function diffSnapshots(before, after) {
  const changes = [];
  function visit(a, b, path) {
    if (same(a, b)) return;
    if (a && b && typeof a === "object" && typeof b === "object" &&
        !Array.isArray(a) && !Array.isArray(b)) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const key of keys) {
        if (!own(b, key)) changes.push({ op: "remove", path: [...path, key] });
        else if (!own(a, key)) changes.push({ op: "set", path: [...path, key], value: copy(b[key]) });
        else visit(a[key], b[key], [...path, key]);
      }
    } else {
      changes.push({ op: "set", path, value: copy(b) });
    }
  }
  visit(before, after, []);
  return changes;
}

/** Apply a data patch to an independent snapshot; never mutate the source. */
export function applySnapshotPatch(before, changes) {
  let result = copy(before);
  for (const change of changes) {
    if (!Array.isArray(change.path) || !["set", "remove"].includes(change.op)) {
      throw new Error("Invalid history patch operation.");
    }
    // Reject prototype-pollution keys even for imported, untrusted histories.
    if (change.path.some((part) => ["__proto__", "constructor", "prototype"].includes(part))) {
      throw new Error("Unsafe history patch path.");
    }
    if (change.path.length === 0) {
      if (change.op !== "set") throw new Error("Cannot remove the snapshot root.");
      result = copy(change.value);
      continue;
    }
    let parent = result;
    for (const key of change.path.slice(0, -1)) {
      if (parent == null || !own(parent, key)) throw new Error("History patch path not found.");
      parent = parent[key];
    }
    const key = change.path.at(-1);
    if (parent == null || typeof parent !== "object") throw new Error("Invalid history patch parent.");
    if (change.op === "remove") delete parent[key];
    else parent[key] = copy(change.value);
  }
  return result;
}

function collectNodeIds(root, output = new Set()) {
  if (!root || typeof root !== "object") return output;
  if (typeof root.id === "string") output.add(root.id);
  if (Array.isArray(root.operands)) root.operands.forEach((node) => collectNodeIds(node, output));
  if (root.left) collectNodeIds(root.left, output);
  if (root.right) collectNodeIds(root.right, output);
  if (root.operand) collectNodeIds(root.operand, output);
  if (root.child) collectNodeIds(root.child, output);
  return output;
}

export function createDocumentHistory() {
  return { schemaVersion: 2, nodes: [], nextNodeId: 1, currentNodeId: null };
}

export function findHistoryState(history, id) {
  return history.nodes.find((node) => node.id === id) || null;
}

/**
 * Commit one state and its event atomically. Optional `operation` metadata is
 * supplied by the caller, never guessed from an English-language UI label.
 * For legacy callers, ruleId stays null rather than inventing a justification.
 */
export function appendHistoryState(history, snapshot, {
  actionLabel, kind = "rule-transform", transformation = null, operation = null
}) {
  const parent = findHistoryState(history, history.currentNodeId);
  if (history.currentNodeId !== null && !parent) throw new Error("History parent not found.");
  const id = history.nextNodeId;
  const current = copy(snapshot);
  const previous = parent?.snapshot ?? null;
  const changes = previous === null ? [{ op: "set", path: [], value: current }]
    : diffSnapshots(previous, current);
  const beforeIds = collectNodeIds(previous?.expression);
  const afterIds = collectNodeIds(current.expression);
  const event = {
    schemaVersion: HISTORY_EVENT_VERSION,
    id: `event-${id}`,
    kind,
    ruleId: operation?.ruleId ?? transformation?.rule ?? null,
    ruleVersion: operation?.ruleVersion ?? null,
    inputs: copy(operation?.inputs ?? null),
    affectedNodeIds: copy(operation?.affectedNodeIds ?? []),
    generatedNodeIds: [...afterIds].filter((nodeId) => !beforeIds.has(nodeId)),
    provenance: copy(transformation),
    fromStateId: parent?.stateId ?? null,
    toStateId: `state-${id}`,
    beforeFingerprint: previous === null ? null : snapshotFingerprint(previous),
    afterFingerprint: snapshotFingerprint(current),
    patch: changes
  };
  const node = {
    id, stateId: event.toStateId, eventId: event.id,
    kind, parentId: parent?.id ?? null, children: [], actionLabel,
    snapshot: current, transformation: copy(transformation),
    event, createdAt: new Date().toISOString()
  };
  // All validation and construction happen before changing the history graph.
  history.nodes.push(node);
  history.nextNodeId = id + 1;
  if (parent) parent.children.push(id);
  history.currentNodeId = id;
  return node;
}

/**
 * Reconstruct any branch from its initial event. This is an explicit replay
 * capability, not the default undo path. It never executes mathematical rules.
 */
export function replayHistoryState(history, targetId) {
  const target = findHistoryState(history, targetId);
  if (!target) throw new Error("Unknown history state.");
  const chain = [];
  const seen = new Set();
  let node = target;
  while (node) {
    if (seen.has(node.id)) throw new Error("Cycle in history graph.");
    seen.add(node.id);
    chain.push(node);
    node = node.parentId === null ? null : findHistoryState(history, node.parentId);
    if (chain.at(-1).parentId !== null && !node) throw new Error("Broken history parent link.");
  }
  let snapshot = null;
  for (const state of chain.reverse()) {
    const event = state.event;
    if (!event || event.schemaVersion !== HISTORY_EVENT_VERSION) throw new Error("Unsupported history event version.");
    if (event.beforeFingerprint !== (snapshot === null ? null : snapshotFingerprint(snapshot))) {
      throw new Error("History replay input differs from recorded state.");
    }
    snapshot = applySnapshotPatch(snapshot, event.patch);
    if (snapshotFingerprint(snapshot) !== event.afterFingerprint) {
      throw new Error("History replay result differs from recorded state.");
    }
  }
  return snapshot;
}

/** Check snapshots against event replay without changing the active state. */
export function verifyHistoryReplay(history) {
  return history.nodes.every((node) => same(replayHistoryState(history, node.id), node.snapshot));
}

/**
 * Produce an event-only serialisable history without changing the live editor.
 * The UI still needs snapshots for instant navigation; hydrate on import.
 */
export function exportEventHistory(history) {
  return {
    schemaVersion: history.schemaVersion,
    nextNodeId: history.nextNodeId,
    currentNodeId: history.currentNodeId,
    nodes: history.nodes.map(({ snapshot, ...rest }) => copy(rest))
  };
}

/** Refuse patches that would create sparse arrays or traverse the wrong container. */
function assertPatchTargets(snapshot, changes) {
  for (const change of changes) {
    if (!Array.isArray(change.path)) throw new Error('Invalid history patch path.');
    if (!change.path.length) continue;
    let parent = snapshot;
    for (const key of change.path.slice(0, -1)) {
      if (parent === null || typeof parent !== 'object' || !own(parent, key))
        throw new Error('History patch path not found.');
      if (Array.isArray(parent) && (!Number.isSafeInteger(key) || key < 0 || key >= parent.length))
        throw new Error('Invalid history array path.');
      parent = parent[key];
    }
    if (parent === null || typeof parent !== 'object') throw new Error('Invalid history patch parent.');
    const key = change.path.at(-1);
    if (Array.isArray(parent)) {
      if (!Number.isSafeInteger(key) || key < 0 || key >= parent.length || change.op === 'remove')
        throw new Error('Invalid history array operation.');
    } else if (typeof key !== 'string') {
      throw new Error('Invalid history object path.');
    }
  }
}

/** Rebuild missing snapshots from events before handing history to the editor. */
export function hydrateHistorySnapshots(historyData) {
  const history = copy(historyData);
  const byId = new Map();
  for (const node of history.nodes) {
    if (!Number.isSafeInteger(node.id) || byId.has(node.id)) throw new Error('Duplicate or invalid history node ID.');
    byId.set(node.id, node);
  }
  const completed = new Set(), visiting = new Set();
  // Iterative parent-first traversal: each event is applied exactly once.
  for (const target of history.nodes) {
    let node = target;
    const chain = [];
    while (!completed.has(node.id)) {
      if (visiting.has(node.id)) throw new Error('Cycle in history graph.');
      visiting.add(node.id); chain.push(node);
      if (node.parentId === null) break;
      node = byId.get(node.parentId);
      if (!node) throw new Error('Broken history parent link.');
    }
    for (const state of chain.reverse()) {
      const previous = state.parentId === null ? null : byId.get(state.parentId).snapshot;
      const event = state.event;
      if (!event || event.schemaVersion !== HISTORY_EVENT_VERSION ||
          event.beforeFingerprint !== (previous === null ? null : snapshotFingerprint(previous)))
        throw new Error('History replay input differs from recorded state.');
      assertPatchTargets(previous, event.patch);
      const restored = applySnapshotPatch(previous, event.patch);
      if (snapshotFingerprint(restored) !== event.afterFingerprint)
        throw new Error('History replay result differs from recorded state.');
      if (state.snapshot && !same(state.snapshot, restored))
        throw new Error('Stored snapshot conflicts with its event history.');
      state.snapshot = restored;
      completed.add(state.id); visiting.delete(state.id);
    }
  }
  return history;
}
