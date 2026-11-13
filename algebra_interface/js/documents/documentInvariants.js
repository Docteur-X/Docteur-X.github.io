import { SERIALIZATION_LIMITS, assertBoundedJson } from './serializationLimits.js';
/** Opt-in integrity audit for hydrated documents. No storage or editor side effects. */
import { hydrateHistorySnapshots, snapshotFingerprint } from './documentHistory.js';
import { categoryOf } from '../engine/nodeCategories.js';
import { childEntries, meaningFieldsOf, nodeTypeInfo, notationFieldsOf } from '../engine/nodeRegistry.js';

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fail = message => { throw new Error(`Document invariant: ${message}`); };
const safeKey = k => !['__proto__', 'prototype', 'constructor'].includes(k);

/** Validate the current AST vocabulary without modifying IDs or expressions. */
export function assertAstInvariants(root) {
  if (root === null) return;
  assertBoundedJson(root);
  const seen = new Set();
  let count = 0;
  function walk(node, statementAllowed = false, depth = 0) {
    if (depth > SERIALIZATION_LIMITS.maxDepth) fail('AST depth limit exceeded');
    if (!record(node) || typeof node.id !== 'string' || !node.id || seen.has(node.id)) fail('invalid or duplicate AST node ID');
    seen.add(node.id);
    if (++count > SERIALIZATION_LIMITS.maxValues) fail("AST size limit exceeded");
    // Every rule below is read from the node registry (nodeRegistry.js).
    const info = nodeTypeInfo(node);
    if (!info) fail('unknown AST node type');
    if (info.category === 'statement' && !statementAllowed) fail(`a ${node.type} statement can only be the whole object`);
    for (const [key, valid] of Object.entries(meaningFieldsOf(info))) if (!valid(node[key])) fail(`invalid ${node.type.toLowerCase()} ${key}`);
    for (const [key, spec] of Object.entries(notationFieldsOf(info))) if (!spec.values.includes(node[key])) fail(`invalid ${node.type.toLowerCase()} ${key}`);
    const shape = info.children;
    const children = childEntries(node);
    if (shape.kind === 'list' && (!Array.isArray(node[shape.key]) || node[shape.key].length < shape.min ||
        children.length !== node[shape.key].length)) fail(`invalid ${node.type} ${shape.key}`);
    if (shape.kind === 'single' && !record(node[shape.key])) fail(`invalid ${node.type} ${shape.key}`);
    if (shape.kind === 'named' && shape.keys.some(key => !record(node[key]))) fail(`invalid ${node.type} sides`);
    children.forEach(({ child }) => walk(child, false, depth + 1));
  }
  walk(root, true);
  if (!categoryOf(root)) fail('invalid root category');
}

/** Validate patches as data before replay, including array index and path safety. */
export function assertPatchInvariants(patch) {
  if (!Array.isArray(patch) || patch.length > SERIALIZATION_LIMITS.maxPatchOperations) fail('invalid patch size');
  for (const change of patch) {
    if (!record(change) || Object.keys(change).some(k => !['op','path','value'].includes(k)) || !['set','remove'].includes(change.op) || !Array.isArray(change.path) || change.path.length > SERIALIZATION_LIMITS.maxDepth ||
        change.path.some(k => !(typeof k === 'string' || (Number.isSafeInteger(k) && k >= 0 && k < SERIALIZATION_LIMITS.maxArrayLength)) ||
          (typeof k === 'string' && !safeKey(k))) ||
        (change.op === 'set' && !own(change, 'value')) ||
        (change.op === 'remove' && (change.path.length === 0 || own(change, 'value'))) ||
        (change.path.length > 0 && change.path[0] !== 'expression' && change.path[0] !== 'substitutions')) fail('invalid patch operation');
  }
}

/** Verify graph links, event identities, replay and all cached snapshots. */
export function assertHistoryInvariants(history) {
  assertBoundedJson(history);
  if (!record(history) || history.schemaVersion !== 2 || !Array.isArray(history.nodes) ||
      !Number.isSafeInteger(history.nextNodeId) || history.nextNodeId < 1) fail('invalid history header');
  if (history.nodes.length > SERIALIZATION_LIMITS.maxHistoryNodes) fail("history size limit exceeded");
  const byId = new Map();
  for (const node of history.nodes) {
    if (!record(node) || !Number.isSafeInteger(node.id) || node.id < 1 || byId.has(node.id)) fail('invalid history node ID');
    byId.set(node.id, node);
  }
  if (history.nodes.length === 0) {
    if (history.currentNodeId !== null || history.nextNodeId !== 1) fail('invalid empty history');
    return;
  }
  if (!byId.has(history.currentNodeId) || history.nextNodeId <= Math.max(...byId.keys())) fail('invalid history cursor or counter');
  let roots = 0;
  for (const node of history.nodes) {
    if (node.parentId === null) roots++;
    else if (!byId.has(node.parentId)) fail('missing history parent');
    if (!Array.isArray(node.children) || new Set(node.children).size !== node.children.length ||
        node.children.some(id => !byId.has(id) || byId.get(id).parentId !== node.id)) fail('invalid history children');
    if (node.parentId !== null && !byId.get(node.parentId).children.includes(node.id)) fail('missing reciprocal history link');
    const e = node.event;
    if (!record(e) || e.schemaVersion !== 1 || e.id !== `event-${node.id}` ||
        node.eventId !== e.id || node.stateId !== `state-${node.id}` || e.toStateId !== node.stateId ||
        e.fromStateId !== (node.parentId === null ? null : byId.get(node.parentId).stateId) ||
        typeof e.afterFingerprint !== 'string' ||
        (node.parentId !== null && typeof e.beforeFingerprint !== 'string') ||
        (node.parentId === null && e.beforeFingerprint !== null)) fail('invalid event metadata');
    assertPatchInvariants(e.patch);
    // Assumptions a step relies on (division stage D3), when present.
    if (own(e, 'assumptions') && (!Array.isArray(e.assumptions) || e.assumptions.length > 32 ||
        e.assumptions.some(a => !record(a) || typeof a.kind !== 'string' || typeof a.text !== 'string' ||
          !a.text.trim() || a.text.length > 200))) fail('invalid step assumptions');
    if (!record(node.snapshot) || !own(node.snapshot, 'expression') || !record(node.snapshot.substitutions)) fail('invalid history snapshot');
    assertAstInvariants(node.snapshot.expression);
    if (snapshotFingerprint(node.snapshot) !== e.afterFingerprint) fail('snapshot fingerprint mismatch');
  }
  if (roots !== 1) fail('history must have exactly one root');
  let hydrated;
  try { hydrated = hydrateHistorySnapshots(history); }
  catch (error) { fail(`history replay failed: ${error.message}`); }
  for (let i=0; i<history.nodes.length; i++) {
    if (!same(hydrated.nodes[i].snapshot, history.nodes[i].snapshot)) fail('replay differs from snapshot');
  }
}

/** Strict opt-in audit: importing older documents and live saving are unchanged by it. */
export function assertDocumentInvariants(doc) {
  if (!record(doc) || doc.schemaVersion !== 2 || !record(doc.objects) || !Array.isArray(doc.objectOrder) ||
      new Set(doc.objectOrder).size !== doc.objectOrder.length ||
      Object.keys(doc.objects).length !== doc.objectOrder.length ||
      (doc.activeObjectId !== null && !doc.objectOrder.includes(doc.activeObjectId))) fail('invalid document collection');
  if (doc.objectOrder.length > SERIALIZATION_LIMITS.maxObjects) fail("document object limit exceeded");
  assertBoundedJson(doc);
  for (const id of doc.objectOrder) {
    if (!safeKey(id) || !own(doc.objects, id)) fail('missing object');
    const object = doc.objects[id];
    if (!record(object) || object.id !== id || !record(object.substitutions)) fail('invalid object');
    assertAstInvariants(object.root);
    if (object.kind !== (object.root === null ? null : categoryOf(object.root))) fail('object kind disagrees with AST');
    assertHistoryInvariants(object.history);
    if (object.history.nodes.length) {
      const current = object.history.nodes.find(n => n.id === object.history.currentNodeId).snapshot;
      if (!same(current.expression, object.root) || !same(current.substitutions, object.substitutions))
        fail('object state disagrees with history cursor');
    }
  }
}
