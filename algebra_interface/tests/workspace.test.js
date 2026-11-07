import test from 'node:test';
import assert from 'node:assert/strict';
import { newDocument, addObject, captureDocument, duplicateDocument, validateDocument,
  getActiveObject, reserveDocumentNodeIds, migrateDocument, removeObject } from '../js/core/workspaceDocuments.js';
import { createDocumentController } from '../js/core/documentController.js';
import { createDocumentHistory, appendHistoryState } from '../js/core/documentHistory.js';
import { parseExpression } from '../js/core/parser.js';
import { reserveNodeIds, createNodeId } from '../js/core/nodeFactory.js';

test('new documents may be empty and have independent object collections', () => {
  const a = newDocument('A'), b = newDocument('B');
  assert.notEqual(a.id, b.id);
  assert.deepEqual(a.objectOrder, []);
  assert.equal(a.activeObjectId, null);
  assert.deepEqual(b.objects, {});
});
test('object controller captures committed trees and independent histories', () => {
  const controller = createDocumentController(addObject(newDocument('Algebra'), 'Equation'));
  const equationId = controller.activeObject.id;
  const root = parseExpression('a+b=c');
  const history = createDocumentHistory();
  appendHistoryState(history, {expression:root, substitutions:{}}, {actionLabel:'Constructed',kind:'construction'});
  controller.commit(root, history, {a:2});
  controller.addObject('Auxiliary');
  const auxiliaryId = controller.activeObject.id;
  controller.commit(parseExpression('-3'), createDocumentHistory(), {});
  assert.equal(controller.document.objects[equationId].root.type, 'Equal');
  assert.equal(controller.document.objects[equationId].history.nodes.length, 1);
  assert.equal(controller.document.objects[equationId].substitutions.a, 2);
  assert.equal(controller.document.objects[auxiliaryId].history.nodes.length, 0);
  root.left.operands[0].name = 'changed';
  assert.equal(controller.document.objects[equationId].root.left.operands[0].name, 'a');
  controller.activateObject(equationId);
  assert.equal(controller.activeObject.id, equationId);
});
test('duplicate receives new document and object IDs without losing branch histories', () => {
  const doc = captureDocument(addObject(newDocument('Original')), parseExpression('x=y'), createDocumentHistory(), {});
  const duplicate = duplicateDocument(doc);
  assert.notEqual(duplicate.id, doc.id);
  assert.notEqual(duplicate.activeObjectId, doc.activeObjectId);
  assert.deepEqual(getActiveObject(duplicate).root, getActiveObject(doc).root);
});
test('v2 documents round trip and reject invalid object collections', () => {
  const doc = captureDocument(addObject(newDocument('Save me')), parseExpression('3=3'), createDocumentHistory(), {});
  assert.deepEqual(validateDocument(JSON.parse(JSON.stringify(doc))), doc);
  assert.throws(() => validateDocument({...doc,schemaVersion:999}));
  assert.throws(() => validateDocument({...doc,objectOrder:['missing']}));
});
test('v1 documents migrate without altering mathematical history or node IDs', () => {
  const root = parseExpression('a+b=c');
  const history = createDocumentHistory();
  appendHistoryState(history, {expression:root,substitutions:{}}, {actionLabel:'Build',kind:'construction'});
  const legacy = {id:'doc-old',title:'Legacy',schemaVersion:1,root,kind:'statement',history,substitutions:{},metadata:{}};
  const migrated = validateDocument(legacy);
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.id, legacy.id);
  assert.deepEqual(getActiveObject(migrated).history, history);
  assert.deepEqual(getActiveObject(migrated).root, root);
  assert.equal(Object.hasOwn(migrated,'root'),false);
});
test('removing last object leaves a valid empty document', () => {
  const doc = addObject(newDocument('A'));
  const empty = removeObject(doc, doc.activeObjectId);
  assert.equal(empty.activeObjectId,null);
  assert.deepEqual(validateDocument(empty).objectOrder,[]);
});
test('restored history node IDs are reserved for future parsing', () => {
  reserveNodeIds({id:'node-100000',type:'Symbol',name:'x'});
  assert.ok(Number(createNodeId().slice(5)) > 100000);
});
