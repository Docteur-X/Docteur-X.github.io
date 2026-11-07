/**
 * Factorisation's registered mathematical proposal must work with the same
 * source-stamped, single-use history gate as distribution and identity.
 * These tests deliberately avoid DOM dependencies: the browser suite covers
 * the student's amber preview, while this suite protects mathematical state.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../js/core/parser.js';
import { getFactorisationPlan } from '../js/operations/factorisation.js';
import { factorisationActionRequest } from '../js/manipulator/factorisationGesture.js';
import { createApplicationTransformationFeatures } from '../js/composition/transformationFeatureAssembly.js';
import { createTransformationCoordinator } from '../js/manipulator/transformationCoordinator.js';
import { createTransformationCommitLifecycle } from '../js/manipulator/transformationCommitLifecycle.js';
import { prepareAtomicTransformationCommit } from '../js/manipulator/atomicTransformationCommit.js';
import { createDocumentHistory, appendHistoryState } from '../js/core/documentHistory.js';

function setup() {
  const root = parseExpression('(a*b+a*c)');
  const sum = root.operands[0].operand;
  const ids = sum.operands.map(p => p.operands[0].id);
  const plan = getFactorisationPlan(root, ids);
  const action = factorisationActionRequest(plan);
  const candidate = createTransformationCoordinator(createApplicationTransformationFeatures()).propose(root, action);
  assert.ok(candidate?.result?.root, 'registered proposal exposes shared lifecycle root');
  const history = createDocumentHistory();
  appendHistoryState(history, { expression: structuredClone(root), substitutions: {} }, { actionLabel: 'Initial' });
  const stamp = { documentId: 'doc', objectId: 'obj', revision: history.currentNodeId,
    rootId: root.id, fingerprint: JSON.stringify(root) };
  return { root, history, stamp, candidate };
}

test('factorisation commits one detached history branch and preserves source', () => {
  const { root, history, stamp, candidate } = setup();
  const source = structuredClone(root);
  const previousHistory = structuredClone(history);
  const gate = createTransformationCommitLifecycle();
  assert.equal(gate.open(candidate, stamp), true);
  let published;
  assert.equal(gate.confirm(stamp, selected => {
    published = prepareAtomicTransformationCommit({ history,
      resultRoot: selected.result.proposal.root, substitutions: {},
      actionLabel: 'Extracted common factor',
      transformation: selected.result.proposal.provenance,
      operation: { ruleId: selected.action.ruleId, ruleVersion: 1 } });
  }).status, 'committed');
  assert.deepEqual(root, source);
  assert.deepEqual(history, previousHistory);
  assert.equal(published.history.nodes.length, previousHistory.nodes.length + 1);
  assert.deepEqual(published.history.nodes.at(-1).snapshot.expression, published.root);
  assert.equal(gate.confirm(stamp, () => assert.fail('duplicate')).status, 'absent');
});

test('factorisation cancel and stale revision cannot commit', () => {
  const { stamp, candidate } = setup();
  const gate = createTransformationCommitLifecycle();
  gate.open(candidate, stamp);
  gate.cancel();
  assert.equal(gate.confirm(stamp, () => assert.fail('cancelled')).status, 'absent');
  gate.open(candidate, stamp);
  assert.equal(gate.confirm({ ...stamp, revision: 'another-branch' },
    () => assert.fail('stale')).status, 'stale');
});

test('factorisation history preparation failure leaves authoritative state unchanged', () => {
  const { root, history, stamp, candidate } = setup();
  const source = structuredClone(root);
  const oldHistory = structuredClone(history);
  const gate = createTransformationCommitLifecycle();
  gate.open(candidate, stamp);
  assert.throws(() => gate.confirm(stamp, selected => prepareAtomicTransformationCommit({
    history, resultRoot: selected.result.proposal.root, substitutions: {},
    actionLabel: 'Extracted common factor', transformation: { unsupported: 1n }
  })));
  assert.deepEqual(root, source);
  assert.deepEqual(history, oldHistory);
  assert.equal(gate.isOpen(), false);
});
