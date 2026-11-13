import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocumentHistory, appendHistoryState } from '../../js/documents/documentHistory.js';
import { prepareAtomicTransformationCommit } from '../../js/steps/atomicTransformationCommit.js';

const original = () => ({ type: 'Number', id: 'n1', value: 2 });
function fixture() {
  const history = createDocumentHistory();
  appendHistoryState(history, { expression: original(), substitutions: {} }, { actionLabel: 'Initial' });
  return history;
}

test('atomic preparation adds one branch on detached history and preserves the live cursor', () => {
  const history = fixture();
  const before = structuredClone(history);
  const result = prepareAtomicTransformationCommit({ history, resultRoot: { type: 'Number', id: 'n2', value: 3 },
    substitutions: {}, actionLabel: 'Change' });
  assert.deepEqual(history, before);
  assert.equal(result.history.nodes.length, 2);
  assert.equal(result.history.currentNodeId, 2);
  assert.equal(result.history.nodes[0].children[0], 2);
  assert.equal(result.root.value, 3);
});

test('failed history preparation cannot mutate the original history', () => {
  const history = fixture();
  const before = structuredClone(history);
  assert.throws(() => prepareAtomicTransformationCommit({ history, resultRoot: original(), substitutions: {},
    actionLabel: 'Invalid provenance', transformation: { unsafe: 1n } }));
  assert.deepEqual(history, before);
});

test('published candidates are detached from external proposal references', () => {
  const history = fixture();
  const candidate = { type: 'Number', id: 'n2', value: 3 };
  const staged = prepareAtomicTransformationCommit({ history, resultRoot: candidate, substitutions: {}, actionLabel: 'Change' });
  candidate.value = 99;
  assert.equal(staged.root.value, 3);
  assert.equal(staged.history.nodes[1].snapshot.expression.value, 3);
});
