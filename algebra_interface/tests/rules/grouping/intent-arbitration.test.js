import test from 'node:test';
import assert from 'node:assert/strict';
import { arbitrateIntents } from '../../../js/view/drag/intentArbitration.js';
import { arbitrateGroupingPreview } from '../../../js/rules/grouping/intentArbitration.js';
import { groupingActionRequest } from '../../../js/rules/grouping/gesture.js';

const plan = Object.freeze({ parentType: 'Add', parentId: 'p', operandIds: ['a','b'] });
const session = Object.freeze({ viewId: 'main', objectId: 'object-1', sessionToken: 'group-1' });
const action = groupingActionRequest(plan);
const candidate = { result: { plan } };
const decide = (changes = {}) => arbitrateGroupingPreview({
  arbitrateIntents, session, sourceValid: true, plan, action, candidate, ...changes
});
test('deliberate grouping preview is selected with existing validated candidate', () => {
  const result = decide();
  assert.equal(result.status, 'chosen');
  assert.equal(result.proposal.kind, 'group');
  assert.equal(result.proposal.sourceOccurrenceId, 'p');
  assert.equal(Object.isFrozen(result.proposal), true);
});
test('selection alone or absent candidate cannot propose grouping', () => {
  assert.equal(decide({ candidate: null }).status, 'none');
  assert.equal(decide({ action: null }).status, 'none');
});
test('stale and modal-blocked grouping sessions fail closed', () => {
  assert.equal(decide({ sourceValid: false }).status, 'blocked');
  assert.equal(decide({ modalBlocked: true }).status, 'blocked');
});
test('mismatched or malformed grouping plan cannot be selected', () => {
  assert.equal(decide({ plan: { ...plan, operandIds: ['b','a'] } }).status, 'none');
  assert.equal(decide({ plan: { ...plan, operandIds: ['a','a'] } }).status, 'none');
  assert.equal(decide({ candidate: { result: { plan: { ...plan, parentId: 'other' } } } }).status, 'none');
});
test('missing view, object, or token fails closed', () => {
  for (const field of ['viewId','objectId','sessionToken']) {
    assert.notEqual(decide({ session: { ...session, [field]: '' } }).status, 'chosen');
  }
});
test('multiply range grouping uses the same narrow contract', () => {
  const product = { parentType: 'Multiply', parentId: 'product', operandIds: ['x','y'] };
  assert.equal(decide({ plan: product, action: groupingActionRequest(product),
    candidate: { result: { plan: product } } }).status, 'chosen');
});
test('invalid candidate or malformed session cannot throw or authorize preview', () => {
  for (const bad of [null, {}, { result: null }, { result: { plan: null } }]) {
    assert.notEqual(decide({ candidate: bad }).status, 'chosen');
  }
  assert.notEqual(decide({ session: null }).status, 'chosen');
});

// Phase 3D-3 hardening: parent identity alone is insufficient when the
// candidate claims a different associative operation.
test('candidate parent type must agree with the selected grouping plan', () => {
  assert.equal(decide({ candidate: { result: { plan: { ...plan, parentType: 'Multiply' } } } }).status, 'none');
  assert.equal(decide({ candidate: { result: { plan: { ...plan, parentType: undefined } } } }).status, 'none');
});

test('real grouping coordinator candidate is accepted without changing the AST', async () => {
  const { parseExpression } = await import('../../helpers/legacyRootParser.js');
  const { getRangeGroupingPlan } = await import('../../../js/engine/operations/grouping.js');
  const { createTransformationCoordinator } = await import('../../../js/steps/transformationCoordinator.js');
  const root = parseExpression('a+b+c');
  const ids = root.operands.slice(0, 2).map(node => node.id);
  const realPlan = getRangeGroupingPlan(root, ids);
  const realAction = groupingActionRequest(realPlan);
  const coordinator = createTransformationCoordinator({
    'grouping.range': {
      propose(source, parameters) {
        const verified = getRangeGroupingPlan(source, parameters.operandIds);
        return verified && verified.parentId === parameters.parentId &&
          verified.parentType === parameters.parentType ? { plan: verified } : null;
      },
      confirmationMode: 'preview'
    }
  });
  const before = JSON.stringify(root);
  const realCandidate = coordinator.propose(root, realAction);
  assert.ok(realCandidate);
  const outcome = decide({ plan: realPlan, action: realAction, candidate: realCandidate });
  assert.equal(outcome.status, 'chosen');
  assert.equal(JSON.stringify(root), before);
});
