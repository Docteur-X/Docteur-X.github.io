import test from 'node:test';
import assert from 'node:assert/strict';
import { createObjectWorkingState } from '../../js/documents/objectWorkingState.js';
import { createDocumentController } from '../../js/documents/documentController.js';
import { newDocument, addObject } from '../../js/documents/workspaceDocuments.js';
import { createDocumentHistory } from '../../js/documents/documentHistory.js';
import { parseExpression } from '../helpers/legacyRootParser.js';

test('working edits cannot mutate a committed document snapshot', () => {
  const controller = createDocumentController(addObject(newDocument('Isolation')));
  controller.commit(parseExpression('a+b'), createDocumentHistory(), { a: { value: 2 } });
  const committed = controller.document;
  const before = JSON.stringify(committed);
  const working = createObjectWorkingState(controller.activeObject);
  working.expressionRoot.id = 'edited-root';
  working.history.nextNodeId = 999;
  working.substitutions.a.value = 42;
  assert.equal(JSON.stringify(committed), before);
  assert.notStrictEqual(working.history, controller.activeObject.history);
  assert.notStrictEqual(working.substitutions, controller.activeObject.substitutions);
});

test('working state from absent object has independent empty containers', () => {
  const first = createObjectWorkingState(null);
  const second = createObjectWorkingState(null);
  assert.equal(first.expressionRoot, null);
  first.history.nextNodeId = 999;
  first.substitutions.x = 1;
  assert.notEqual(second.history.nextNodeId, 999);
  assert.deepEqual(second.substitutions, {});
});
