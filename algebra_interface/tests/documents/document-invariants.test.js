import test from 'node:test';
import assert from 'node:assert/strict';
import { assertAstInvariants, assertHistoryInvariants, assertDocumentInvariants, assertPatchInvariants } from '../../js/documents/documentInvariants.js';
import { createDocumentHistory, appendHistoryState } from '../../js/documents/documentHistory.js';
import { parseExpression } from '../helpers/legacyRootParser.js';
import { addObject, newDocument, captureDocument } from '../../js/documents/workspaceDocuments.js';

const make = () => {
  const root = parseExpression('a+b');
  const history = createDocumentHistory();
  appendHistoryState(history, {expression:root, substitutions:{}}, {actionLabel:'Build',kind:'construction'});
  return captureDocument(addObject(newDocument('Check')), root, history, {});
};
const broken = (doc, change) => { const copy = structuredClone(doc); change(copy.objects[copy.activeObjectId]); return copy; };

test('strict invariant audit accepts consistent multi-object documents', () => {
  const doc = make();
  assert.doesNotThrow(() => assertDocumentInvariants(doc));
  assert.doesNotThrow(() => assertDocumentInvariants(addObject(doc, 'Empty')));
});
test('AST audit detects duplicate IDs, invalid children and unknown node types', () => {
  const root = parseExpression('a+b');
  root.operands[1].id = root.operands[0].id;
  assert.throws(() => assertAstInvariants(root), /duplicate AST/);
  assert.throws(() => assertAstInvariants({id:'node-x',type:'Unknown'}), /unknown AST/);
  assert.throws(() => assertAstInvariants({id:'node-x',type:'Apply',operator:'f',arguments:[null]}), /AST node/);
});
test('history audit rejects broken branches, cycles and stale cursors', () => {
  const h = createDocumentHistory();
  const first = appendHistoryState(h,{expression:parseExpression('a'),substitutions:{}},{actionLabel:'Initial'});
  appendHistoryState(h,{expression:parseExpression('b'),substitutions:{}},{actionLabel:'Edit'});
  assert.doesNotThrow(() => assertHistoryInvariants(h));
  const missing = structuredClone(h); missing.nodes[1].parentId = 999;
  assert.throws(() => assertHistoryInvariants(missing), /parent|children/);
  const cycle = structuredClone(h); cycle.nodes[0].parentId = cycle.nodes[1].id;
  assert.throws(() => assertHistoryInvariants(cycle));
  const cursor = structuredClone(h); cursor.currentNodeId = 999;
  assert.throws(() => assertHistoryInvariants(cursor), /cursor/);
  assert.equal(first.id,1);
});
test('history audit rejects tampered snapshots and events', () => {
  const doc = make();
  assert.throws(() => assertDocumentInvariants(broken(doc, o => {o.history.nodes[0].snapshot.expression.operands[0].name='z';})), /fingerprint/);
  assert.throws(() => assertDocumentInvariants(broken(doc, o => {o.history.nodes[0].event.patch[0].value.expression.operands[0].name='z';})), /replay/);
});
test('document audit catches root, substitution and kind disagreement', () => {
  const doc = make();
  assert.throws(() => assertDocumentInvariants(broken(doc,o=>{o.root.operands.reverse();})), /cursor/);
  assert.throws(() => assertDocumentInvariants(broken(doc,o=>{o.substitutions.x=2;})), /cursor/);
  assert.throws(() => assertDocumentInvariants(broken(doc,o=>{o.kind='statement';})), /kind/);
});
test('patch audit refuses unsafe and malformed operations', () => {
  assert.throws(() => assertPatchInvariants([{op:'set',path:['__proto__'],value:{}}]), /patch/);
  assert.throws(() => assertPatchInvariants([{op:'set',path:[-1],value:1}]), /patch/);
  assert.throws(() => assertPatchInvariants([{op:'remove',path:[]}]), /patch/);
  assert.throws(() => assertPatchInvariants([{op:'set',path:['x']}]), /patch/);
});
