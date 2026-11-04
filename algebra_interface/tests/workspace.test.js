import test from 'node:test';
import assert from 'node:assert/strict';
import { newDocument, captureDocument, duplicateDocument, validateDocument } from '../js/core/workspaceDocuments.js';
import { createDocumentController } from '../js/core/documentController.js';
import { createDocumentHistory, appendHistoryState } from '../js/core/documentHistory.js';
import { parseExpression } from '../js/core/parser.js';
import { reserveNodeIds, createNodeId } from '../js/core/nodeFactory.js';

test('new workspace documents begin empty with independent histories', () => {
  const a = newDocument('A'), b = newDocument('B');
  assert.notEqual(a.id, b.id);
  assert.equal(a.root, null);
  assert.deepEqual(a.history.nodes, []);
});
test('document controller captures a committed tree and its own history', () => {
  const controller = createDocumentController(newDocument('Algebra'));
  const root = parseExpression('a+b=c');
  const history = createDocumentHistory();
  appendHistoryState(history, { expression: root, substitutions: {} }, {actionLabel:'Constructed',kind:'construction'});
  controller.commit(root, history, {a:2});
  assert.equal(controller.document.root.type, 'Equal');
  assert.equal(controller.document.history.nodes.length, 1);
  assert.equal(controller.document.substitutions.a, 2);
  root.left.operands[0].name = 'changed';
  assert.equal(controller.document.root.left.operands[0].name, 'a');
});
test('duplicate gets new document ID without losing its branch graph', () => {
  const doc = captureDocument(newDocument('Original'), parseExpression('x=y'), createDocumentHistory(), {});
  const copy = duplicateDocument(doc);
  assert.notEqual(copy.id, doc.id);
  assert.equal(copy.root.id, doc.root.id);
  assert.match(copy.title, /copy/);
});
test('serialized documents round trip and reject unsupported schema', () => {
  const doc = captureDocument(newDocument('Save me'), parseExpression('3=3'), createDocumentHistory(), {});
  assert.deepEqual(validateDocument(JSON.parse(JSON.stringify(doc))), doc);
  assert.throws(() => validateDocument({...doc,schemaVersion:999}));
});
test('restored history node IDs are reserved for future parsing', () => {
  reserveNodeIds({id:'node-100000',type:'Symbol',name:'x'});
  assert.ok(Number(createNodeId().slice(5)) > 100000);
});
