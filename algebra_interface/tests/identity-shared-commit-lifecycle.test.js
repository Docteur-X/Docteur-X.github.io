import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../js/core/parser.js';
import { createDocumentHistory, appendHistoryState } from '../js/core/documentHistory.js';
import { proposeIdentityInsertion } from '../js/operations/identityInsertion.js';
import { createTransformationCommitLifecycle } from '../js/manipulator/transformationCommitLifecycle.js';
import { prepareAtomicTransformationCommit } from '../js/manipulator/atomicTransformationCommit.js';

/** Integration contract: identity uses the same gate and detached history
 * preparation as equality. No DOM, pointer coordinates or browser persistence
 * participates in the mathematical commit. */
function setup(operation) {
  const root = parseExpression(operation === 'Add' ? 'a+b' : 'a*b');
  const targetNodeId = operation === 'Add' ? root.operands[0].id : root.operands[0].operands[0].id;
  const result = proposeIdentityInsertion(root, { operation, targetNodeId, side: 'right' });
  const history = createDocumentHistory();
  appendHistoryState(history, { expression: structuredClone(root), substitutions: {} }, { actionLabel: 'Initial' });
  const stamp = { documentId: 'document', objectId: 'object', revision: history.currentNodeId,
    rootId: root.id, fingerprint: JSON.stringify(root) };
  return { root, result, history, stamp };
}

for (const operation of ['Add', 'Multiply']) {
  test(`${operation} identity commits once through the shared gate with detached history`, () => {
    const { root, result, history, stamp } = setup(operation);
    const originalRoot = structuredClone(root);
    const originalHistory = structuredClone(history);
    const gate = createTransformationCommitLifecycle();
    assert.equal(gate.open({ result }, stamp), true);
    let published;
    const outcome = gate.confirm(stamp, proposal => {
      published = prepareAtomicTransformationCommit({ history, resultRoot: proposal.result.root,
        substitutions: {}, actionLabel: 'Introduced identity',
        transformation: { createdNodeIds: [proposal.result.identityNodeId] },
        operation: { ruleId: 'identity.introduce', ruleVersion: 1 } });
    });
    assert.equal(outcome.status, 'committed');
    assert.deepEqual(root, originalRoot);
    assert.deepEqual(history, originalHistory);
    assert.equal(published.history.nodes.length, originalHistory.nodes.length + 1);
    assert.deepEqual(published.history.nodes.at(-1).snapshot.expression, published.root);
    assert.equal(gate.confirm(stamp, () => assert.fail('duplicate commit')).status, 'absent');
  });
}

test('identity preview cancellation and stale revision cannot publish mathematical state', () => {
  const { result, stamp } = setup('Add');
  const gate = createTransformationCommitLifecycle();
  assert.equal(gate.open({ result }, stamp), true);
  gate.cancel();
  assert.equal(gate.confirm(stamp, () => assert.fail('cancelled')).status, 'absent');
  assert.equal(gate.open({ result }, stamp), true);
  assert.equal(gate.confirm({ ...stamp, revision: stamp.revision + 1 },
    () => assert.fail('stale')).status, 'stale');
});

test('identity history preparation failure leaves source unchanged and consumes proposal', () => {
  const { root, result, history, stamp } = setup('Multiply');
  const before = structuredClone(history);
  const gate = createTransformationCommitLifecycle();
  gate.open({ result }, stamp);
  assert.throws(() => gate.confirm(stamp, proposal => prepareAtomicTransformationCommit({
    history, resultRoot: proposal.result.root, substitutions: {}, actionLabel: 'Identity',
    transformation: { invalid: 1n }
  })));
  assert.deepEqual(history, before);
  assert.equal(gate.isOpen(), false);
  assert.equal(root.type, 'Add');
});
