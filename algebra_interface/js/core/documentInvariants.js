import { SERIALIZATION_LIMITS, assertBoundedJson } from './serializationLimits.js';
/** Opt-in integrity audit for hydrated documents. No storage or editor side effects. */
import { hydrateHistorySnapshots, snapshotFingerprint } from './documentHistory.js';
import { categoryOf, isExpressionNode } from './nodeCategories.js';

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
    if (node.type === 'Equal') {
      if (!statementAllowed || !record(node.left) || !record(node.right)) fail('invalid equality');
      walk(node.left, false, depth + 1); walk(node.right, false, depth + 1);
      return;
    }
    if (!isExpressionNode(node)) fail('unknown AST node type');
    switch (node.type) {
      case 'Number': if (typeof node.value !== 'number' || !Number.isFinite(node.value)) fail('invalid number'); break;
      case 'Symbol': if (typeof node.name !== 'string' || !node.name.trim()) fail('invalid symbol'); break;
      case 'Add':
      case 'Multiply':
        if (!Array.isArray(node.operands) || node.operands.length === 0) fail('invalid operands');
        if (node.type === 'Multiply' && !['implicit','dot','times'].includes(node.displayStyle)) fail('invalid multiplication style');
        node.operands.forEach(child => walk(child, false, depth + 1)); break;
      case 'Group':
        if (!['round','square','curly'].includes(node.bracketStyle)) fail('invalid bracket style');
        walk(node.operand, false, depth + 1); break;
      case 'Negate': walk(node.operand, false, depth + 1); break;
      case 'FunctionCall':
        if (typeof node.name !== 'string' || !node.name.trim() || !Array.isArray(node.arguments)) fail('invalid function call');
        node.arguments.forEach(child => walk(child, false, depth + 1)); break;
    }
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

/** Strict opt-in audit: legacy import and live save behaviour are unchanged. */
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
