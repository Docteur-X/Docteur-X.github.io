import test from 'node:test';
import assert from 'node:assert/strict';
import { newDocument, addObject } from '../js/core/workspaceDocuments.js';
import { serializeCompactDocument, deserializeCompactDocument } from '../js/core/documentSerialization.js';
import { assertBoundedJson } from '../js/core/serializationLimits.js';
import { assertPatchInvariants } from '../js/core/documentInvariants.js';
import { appendHistoryState, createDocumentHistory, hydrateHistorySnapshots } from '../js/core/documentHistory.js';
import { parseExpression } from '../js/core/parser.js';

test('compact envelopes reject unrecognised fields without changing input', () => {
  const compact = serializeCompactDocument(newDocument());
  compact.extra = 'unknown';
  const original = structuredClone(compact);
  assert.throws(() => deserializeCompactDocument(compact), /Unexpected compact/);
  assert.deepEqual(compact, original);
});

test('JSON inspection rejects deep data, sparse arrays and cycles', () => {
  let deep = null;
  for (let i=0; i<140; i++) deep = {child:deep};
  assert.throws(() => assertBoundedJson(deep), /limit/);
  assert.throws(() => assertBoundedJson(Array(2)), /sparse/);
  const cycle = {}; cycle.self = cycle;
  assert.throws(() => assertBoundedJson(cycle), /acyclic/);
});

test('patch schemas reject unknown fields, unsafe paths and oversized batches', () => {
  assert.throws(() => assertPatchInvariants([{op:'set',path:['__proto__'],value:1}]), /patch/);
  assert.throws(() => assertPatchInvariants([{op:'set',path:['metadata'],value:1}]), /patch/);
  assert.throws(() => assertPatchInvariants([{op:'set',path:[],value:1,extra:true}]), /patch/);
  assert.throws(() => assertPatchInvariants(Array(10001).fill({op:'set',path:[],value:{}})), /size/);
});

test('linear hydration reconstructs long branches without mutating event-only input', () => {
  const history = createDocumentHistory();
  const root = parseExpression('x');
  for (let i=0; i<120; i++) appendHistoryState(history,{expression:root,substitutions:{n:i}},{actionLabel:'Step'});
  const compact = structuredClone(history);
  compact.nodes.forEach(node => delete node.snapshot);
  const original = structuredClone(compact);
  const restored = hydrateHistorySnapshots(compact);
  assert.equal(restored.nodes.length,120);
  assert.equal(restored.nodes[119].snapshot.substitutions.n,119);
  assert.deepEqual(compact,original);
});

test('empty mathematical objects remain serializable', () => {
  const document = addObject(newDocument());
  assert.deepEqual(deserializeCompactDocument(serializeCompactDocument(document)),document);
});
