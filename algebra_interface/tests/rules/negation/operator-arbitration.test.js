import test from 'node:test';
import assert from 'node:assert/strict';
import { arbitrateIntents } from '../../../js/view/drag/intentArbitration.js';
import { arbitrateNegationOperator } from '../../../js/rules/negation/operatorArbitration.js';
import { expandNegationAction } from '../../../js/rules/negation/gesture.js';
import { proposeExpandNegation } from '../../../js/engine/operations/negation.js';
import { createNegate, createSymbol } from '../../../js/engine/nodeFactory.js';

const session = { viewId: 'main', objectId: 'obj', sessionToken: 'neg-1' };
const action = expandNegationAction('n');
const candidate = { action, result: { root: { type: 'Multiply' } } };
const decide = (overrides = {}) => arbitrateNegationOperator({
  arbitrateIntents, session, sourceValid: true, action, candidate, ...overrides
});

test('operator command selects exactly one validated negation expansion', () => {
  const decision = decide();
  assert.equal(decision.status, 'chosen');
  assert.equal(decision.proposal.kind, 'negation-expand');
  assert.equal(decision.proposal.sourceOccurrenceId, 'n');
});
test('invalid or inconsistent mathematical candidates cannot activate preview', () => {
  for (const bad of [null, {}, { result: { root: {} } },
    { action: expandNegationAction('other'), result: { root: {} } },
    { action, result: {} }]) {
    assert.notEqual(decide({ candidate: bad }).status, 'chosen');
  }
  assert.notEqual(decide({ action: { ruleId: 'negation.compress', parameters: { negateNodeId: 'n' } } }).status, 'chosen');
});
test('stale, modal-blocked, and invalid sessions fail closed', () => {
  assert.equal(decide({ sourceValid: false }).status, 'blocked');
  assert.equal(decide({ modalBlocked: true }).status, 'blocked');
  for (const key of ['viewId', 'objectId', 'sessionToken']) {
    assert.notEqual(decide({ session: { ...session, [key]: '' } }).status, 'chosen');
  }
});
test('real negation rule produces a candidate without mutating its source', () => {
  const root = createNegate(createSymbol('a'));
  const negate = root;
  assert.equal(negate.type, 'Negate');
  const actualAction = expandNegationAction(negate.id);
  const before = JSON.stringify(root);
  const result = proposeExpandNegation(root, actualAction.parameters);
  assert.ok(result?.root);
  const decision = decide({ action: actualAction, candidate: { action: actualAction, result } });
  assert.equal(decision.status, 'chosen');
  assert.equal(JSON.stringify(root), before);
});
