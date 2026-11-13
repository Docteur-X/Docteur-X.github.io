/**
 * Grouping is a structural transformation: the candidate must be built on a
 * detached AST, preserve selected operand IDs, and use the same single-use,
 * stale-safe history boundary as algebraic transformations.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../../helpers/legacyRootParser.js';
import { getRangeGroupingPlan } from '../../../js/engine/operations/grouping.js';
import { groupingActionRequest } from '../../../js/rules/grouping/gesture.js';
import { createApplicationTransformationFeatures } from '../../../js/app/transformationFeatureAssembly.js';
import { createTransformationCoordinator } from '../../../js/steps/transformationCoordinator.js';
import { createTransformationCommitLifecycle } from '../../../js/steps/transformationCommitLifecycle.js';
import { prepareAtomicTransformationCommit } from '../../../js/steps/atomicTransformationCommit.js';
import { createDocumentHistory, appendHistoryState } from '../../../js/documents/documentHistory.js';
import { findNodeById } from '../../../js/engine/treeUtils.js';

function setup(input = 'a+b+c', style = 'round') {
  const root = parseExpression(input);
  const parent = root.type === 'Multiply' ? root : root;
  const ids = parent.operands.slice(0, 2).map(n => n.id);
  const plan = getRangeGroupingPlan(root, ids);
  assert.ok(plan);
  const action = groupingActionRequest(plan, style);
  const candidate = createTransformationCoordinator(createApplicationTransformationFeatures()).propose(root, action);
  assert.ok(candidate?.result?.root);
  const history = createDocumentHistory();
  appendHistoryState(history, { expression: structuredClone(root), substitutions: {} }, { actionLabel: 'Initial' });
  const stamp = { documentId: 'doc', objectId: 'obj', revision: history.currentNodeId,
    rootId: root.id, fingerprint: JSON.stringify(root) };
  return { root, history, stamp, candidate, ids };
}

test('grouping creates a detached candidate, retains original IDs, and commits exactly once', () => {
  const { root, history, stamp, candidate, ids } = setup();
  const before = structuredClone(root);
  const beforeHistory = structuredClone(history);
  assert.deepEqual(root, before, 'preview must not change the authoritative AST');
  for (const id of ids) assert.ok(findNodeById(candidate.result.root, id));
  assert.equal(findNodeById(candidate.result.root, candidate.result.groupId)?.type, 'Group');
  const gate = createTransformationCommitLifecycle();
  assert.equal(gate.open(candidate, stamp), true);
  let staged;
  assert.equal(gate.confirm(stamp, selected => {
    staged = prepareAtomicTransformationCommit({ history,
      resultRoot: selected.result.root, substitutions: {}, actionLabel: 'Grouped 2 adjacent addends',
      transformation: selected.result.provenance,
      operation: { ruleId: 'grouping.range', ruleVersion: 1 } });
  }).status, 'committed');
  assert.deepEqual(root, before);
  assert.deepEqual(history, beforeHistory);
  assert.equal(staged.history.nodes.length, beforeHistory.nodes.length + 1);
  assert.deepEqual(staged.history.nodes.at(-1).snapshot.expression, staged.root);
  assert.equal(gate.confirm(stamp, () => assert.fail('duplicate')).status, 'absent');
});

test('grouping cancellation and stale source stamp cannot commit', () => {
  const { stamp, candidate } = setup();
  const gate = createTransformationCommitLifecycle();
  gate.open(candidate, stamp);
  gate.cancel();
  assert.equal(gate.confirm(stamp, () => assert.fail('cancelled')).status, 'absent');
  gate.open(candidate, stamp);
  assert.equal(gate.confirm({ ...stamp, fingerprint: 'changed' },
    () => assert.fail('stale')).status, 'stale');
});

test('grouping history preparation failure does not mutate root or history', () => {
  const { root, history, stamp, candidate } = setup();
  const before = structuredClone(root);
  const beforeHistory = structuredClone(history);
  const gate = createTransformationCommitLifecycle();
  gate.open(candidate, stamp);
  assert.throws(() => gate.confirm(stamp, selected => prepareAtomicTransformationCommit({
    history, resultRoot: selected.result.root, substitutions: {},
    actionLabel: 'Grouping', transformation: { invalid: 1n }
  })));
  assert.deepEqual(root, before);
  assert.deepEqual(history, beforeHistory);
  assert.equal(gate.isOpen(), false);
});
