/**
 * Distribution's shared lifecycle contract, independent of the browser.
 * Distribution is an IN-PLACE AST rule: proposals must be computed on a
 * detached copy, or even an unconfirmed preview would mutate the worksheet.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../js/core/parser.js';
import { getDistributionPlan, applyDistribution, unwrapGroupedSum } from '../js/operations/distribution.js';
import { createDocumentHistory, appendHistoryState } from '../js/core/documentHistory.js';
import { createTransformationCommitLifecycle } from '../js/manipulator/transformationCommitLifecycle.js';
import { prepareAtomicTransformationCommit } from '../js/manipulator/atomicTransformationCommit.js';
import { normaliseWithRules } from '../js/core/normalization.js';

function setup(text, direction) {
  const root = parseExpression(text);
  const original = structuredClone(root);
  const product = root.operands[0];
  const factorIndex = direction === 'left' ? 0 : 1;
  const sumIndex = 1 - factorIndex;
  const sum = unwrapGroupedSum(product.operands[sumIndex]);
  const plan = getDistributionPlan(product, product.operands[factorIndex].id, sum.id);
  assert.equal(plan.direction, direction);
  const rewritten = applyDistribution(structuredClone(root), plan);
  assert.ok(rewritten);
  const result = { root: normaliseWithRules(rewritten.root), provenance: rewritten.provenance, plan };
  const history = createDocumentHistory();
  appendHistoryState(history, { expression: structuredClone(root), substitutions: {} }, { actionLabel: 'Initial' });
  const stamp = { documentId: 'doc', objectId: 'obj', revision: history.currentNodeId,
    rootId: root.id, fingerprint: JSON.stringify(root) };
  return { root, original, history, stamp, result };
}

for (const [text, direction] of [['a*(b+c)', 'left'], ['(b+c)*a', 'right']]) {
  test(`${direction} distribution uses detached, single-use history commit`, () => {
    const { root, original, history, stamp, result } = setup(text, direction);
    assert.deepEqual(root, original, 'building a preview cannot mutate the source AST');
    const beforeHistory = structuredClone(history);
    const gate = createTransformationCommitLifecycle();
    assert.equal(gate.open({ result }, stamp), true);
    let published;
    assert.equal(gate.confirm(stamp, proposal => {
      published = prepareAtomicTransformationCommit({ history, resultRoot: proposal.result.root,
        substitutions: {}, actionLabel: 'Applied distribution',
        transformation: proposal.result.provenance,
        operation: { ruleId: `distribution.${direction}`, ruleVersion: 1 } });
    }).status, 'committed');
    assert.deepEqual(root, original);
    assert.deepEqual(history, beforeHistory);
    assert.equal(published.history.nodes.length, beforeHistory.nodes.length + 1);
    assert.deepEqual(published.history.nodes.at(-1).snapshot.expression, published.root);
    assert.equal(gate.confirm(stamp, () => assert.fail('duplicate')).status, 'absent');
  });
}

test('distribution cancellation and stale source do not commit', () => {
  const { result, stamp } = setup('a*(b+c)', 'left');
  const gate = createTransformationCommitLifecycle();
  gate.open({ result }, stamp);
  gate.cancel();
  assert.equal(gate.confirm(stamp, () => assert.fail('cancelled')).status, 'absent');
  gate.open({ result }, stamp);
  assert.equal(gate.confirm({ ...stamp, fingerprint: 'different' },
    () => assert.fail('stale')).status, 'stale');
});

test('distribution history preparation failure cannot publish partial state', () => {
  const { root, original, history, stamp, result } = setup('a*(b+c)', 'left');
  const beforeHistory = structuredClone(history);
  const gate = createTransformationCommitLifecycle();
  gate.open({ result }, stamp);
  assert.throws(() => gate.confirm(stamp, proposal => prepareAtomicTransformationCommit({
    history, resultRoot: proposal.result.root, substitutions: {},
    actionLabel: 'Applied distribution', transformation: { invalid: 1n }
  })));
  assert.deepEqual(root, original);
  assert.deepEqual(history, beforeHistory);
  assert.equal(gate.isOpen(), false);
});
