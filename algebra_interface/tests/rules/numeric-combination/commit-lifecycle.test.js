import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdd, createMultiply, createNumber, createSymbol } from '../../../js/engine/nodeFactory.js';
import { prepareNumericCombinationCommitCandidate } from '../../../js/rules/numeric-combination/commitCandidate.js';
import { createTransformationCommitLifecycle } from '../../../js/steps/transformationCommitLifecycle.js';
import { prepareAtomicTransformationCommit } from '../../../js/steps/atomicTransformationCommit.js';
import { createDocumentHistory } from '../../../js/documents/documentHistory.js';

const stamp = { documentId: 'd', objectId: 'o', revision: 0, rootId: 'r', fingerprint: 'before' };

for (const [name, factory, expected] of [
  ['addition', createAdd, '8'], ['multiplication', createMultiply, '15']
]) {
  test(`${name} numeric combination is detached, stale-safe and single-use`, () => {
    const [moving, target, untouched] = [createNumber(3), createNumber(5), createSymbol('x')];
    const root = factory([moving, target, untouched]);
    const before = JSON.stringify(root);
    const request = { parentId: root.id, movingNodeId: moving.id, targetNodeId: target.id };
    const proposal = prepareNumericCombinationCommitCandidate(root, request);
    assert.ok(proposal);
    assert.equal(JSON.stringify(root), before, 'proposal must not mutate authoritative AST');
    const resultParent = proposal.result.root.type === 'Add' && name === 'multiplication'
      ? proposal.result.root.operands[0] : proposal.result.root;
    assert.equal(resultParent.operands[0].value, expected);
    assert.equal(resultParent.operands[1].id, untouched.id);
    const gate = createTransformationCommitLifecycle();
    assert.equal(gate.open(proposal, stamp), true);
    assert.equal(gate.confirm({ ...stamp, revision: 1 }, () => assert.fail('stale commit')).status, 'stale');
    assert.equal(gate.open(proposal, stamp), true);
    const history = createDocumentHistory({ expression: root, substitutions: {} });
    let staged;
    assert.equal(gate.confirm(stamp, selected => {
      staged = prepareAtomicTransformationCommit({ history, resultRoot: selected.result.root,
        substitutions: {}, actionLabel: selected.actionLabel });
    }).status, 'committed');
    assert.equal(gate.confirm(stamp, () => assert.fail('duplicate commit')).status, 'absent');
    assert.equal(JSON.stringify(root), before);
    const committedParent = staged.root.type === 'Add' && name === 'multiplication'
      ? staged.root.operands[0] : staged.root;
    assert.equal(committedParent.operands[0].value, expected);
    assert.notEqual(staged.history.currentNodeId, history.currentNodeId);
  });
}

test('zero multiplication collapses whole product; literal identities preserve surviving IDs', () => {
  const zero = createNumber(0), x = createSymbol('x'), y = createSymbol('y');
  const product = createMultiply([zero, x, y]);
  const before = JSON.stringify(product);
  const result = prepareNumericCombinationCommitCandidate(product, {
    parentId: product.id, movingNodeId: zero.id, targetNodeId: x.id
  });
  assert.equal(result.result.root.type, 'Number');
  assert.equal(result.result.root.value, '0');
  assert.equal(JSON.stringify(product), before);
  const one = createNumber(1), z = createSymbol('z');
  const simple = createMultiply([one, z]);
  const identity = prepareNumericCombinationCommitCandidate(simple, {
    parentId: simple.id, movingNodeId: one.id, targetNodeId: z.id
  });
  assert.equal(identity.result.root.id, z.id);
});

test('invalid or cancelled numeric combination never changes the source', () => {
  const a = createSymbol('a'), b = createSymbol('b');
  const root = createAdd([a,b]);
  const before = JSON.stringify(root);
  assert.equal(prepareNumericCombinationCommitCandidate(root, {
    parentId: root.id, movingNodeId: a.id, targetNodeId: b.id
  }), null);
  assert.equal(prepareNumericCombinationCommitCandidate(root, {
    parentId: root.id, movingNodeId: a.id, targetNodeId: a.id
  }), null);
  const gate = createTransformationCommitLifecycle();
  gate.cancel();
  assert.equal(gate.confirm(stamp, () => assert.fail('cancelled commit')).status, 'absent');
  assert.equal(JSON.stringify(root), before);
});

test('history preparation failure cannot mutate original root or history', () => {
  const a = createNumber(2), b = createNumber(3);
  const root = createAdd([a,b]);
  const proposal = prepareNumericCombinationCommitCandidate(root, {
    parentId: root.id, movingNodeId: a.id, targetNodeId: b.id
  });
  const history = createDocumentHistory({ expression: root, substitutions: {} });
  history.uncloneableTestHook = () => {};
  const originalRoot = JSON.stringify(root), originalHistory = JSON.stringify(history);
  const gate = createTransformationCommitLifecycle();
  gate.open(proposal, stamp);
  assert.throws(() => gate.confirm(stamp, selected => prepareAtomicTransformationCommit({
    history, resultRoot: selected.result.root, substitutions: {}, actionLabel: 'test',
    operation: { invalid: () => {} }
  })));
  assert.equal(JSON.stringify(root), originalRoot);
  assert.equal(JSON.stringify(history), originalHistory);
  assert.equal(gate.isOpen(), false);
});
