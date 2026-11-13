// Stage 7: a drop target kind registered by ANY rule bundle reaches its rule.
// Before stage 7 the arbiters listed the known kinds, so a new bundle's drop
// was silently refused (found while building js/rules/both-sides).
import test from 'node:test';
import assert from 'node:assert/strict';
import { arbitrateOrdinaryDrop } from '../../../js/view/drag/ordinaryDropArbitration.js';
import { arbitrateIntents } from '../../../js/view/drag/intentArbitration.js';

const drag = { item: { id: 'b' }, arbitrationViewId: 'v', arbitrationObjectId: 'o', arbitrationSessionToken: 't' };
const decide = (target, ruleKinds) => arbitrateOrdinaryDrop({
  arbitrateIntents, drag, target, sourceValid: true, validate: () => true, ruleKinds });

test('a registered rule kind becomes a generic rule-drop proposal naming it', () => {
  const decision = decide({ kind: 'some-new-rule', id: 'b' }, ['some-new-rule']);
  assert.equal(decision.status, 'chosen');
  assert.equal(decision.proposal.kind, 'rule-drop');
  assert.equal(decision.proposal.ruleTarget, 'some-new-rule');
});

test('an unregistered kind is still refused (no fallback transformation)', () => {
  assert.equal(decide({ kind: 'some-new-rule', id: 'b' }, []).status, 'none');
});

test('built-in kinds keep their own proposal kinds', () => {
  assert.equal(decide({ kind: 'combine', id: 'x' }, ['combine']).proposal.kind, 'combine');
});
