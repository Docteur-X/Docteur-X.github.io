/** Persistence relies on replacement document identities, not a revision counter.
 * These tests protect that contract at the public document-controller boundary.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocumentController } from '../../js/documents/documentController.js';
import { newDocument, addObject } from '../../js/documents/workspaceDocuments.js';
import { createDocumentHistory } from '../../js/documents/documentHistory.js';
import { parseExpression } from '../helpers/legacyRootParser.js';

function controllerWithTwoObjects() {
  const controller = createDocumentController(addObject(newDocument('Snapshot'), 'First'));
  const first = controller.activeObject.id;
  controller.addObject('Second');
  return { controller, first, second: controller.activeObject.id };
}

test('all supported controller edits publish a replacement document', () => {
  const { controller, first, second } = controllerWithTwoObjects();
  const steps = [
    () => controller.activateObject(first),
    () => controller.renameObject(first, 'Renamed'),
    () => controller.rename('Document renamed'),
    () => controller.commit(parseExpression('a+b'), createDocumentHistory(), { a: 2 }),
    () => controller.addObject('Third'),
    () => controller.removeObject(second),
  ];
  for (const step of steps) {
    const previous = controller.document;
    const snapshot = JSON.stringify(previous);
    const next = step();
    assert.notStrictEqual(next, previous, 'edit must publish a new document identity');
    assert.equal(JSON.stringify(previous), snapshot, 'edit must not mutate previous snapshot');
  }
});

test('commits detach nested substitution values and history from caller-owned data', () => {
  const controller = createDocumentController(addObject(newDocument('Nested')));
  const substitutions = { a: { value: 2, details: { precision: 3 } } };
  const history = createDocumentHistory();
  controller.commit(parseExpression('a'), history, substitutions);
  const saved = controller.document;
  substitutions.a.details.precision = 99;
  history.nextNodeId = 999;
  assert.equal(controller.activeObject.substitutions.a.details.precision, 3);
  assert.notEqual(controller.activeObject.history.nextNodeId, 999);
  controller.rename('After commit');
  assert.equal(saved.title, 'Nested');
});

test('switching active objects does not mutate the prior document snapshot', () => {
  const { controller, first } = controllerWithTwoObjects();
  const previous = controller.document;
  const original = JSON.stringify(previous);
  controller.activateObject(first);
  controller.commit(parseExpression('x'), createDocumentHistory(), {});
  assert.equal(JSON.stringify(previous), original);
});
