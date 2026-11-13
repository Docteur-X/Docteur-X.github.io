// Stage E4d: doing the same to both sides of an inequality. What each
// operation does comes from the relation's definition; when the sign of a
// factor matters and is not known, the student is asked (owner decision) and
// the answer is the step's assumption.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToDisplayString } from '../../../js/engine/parser.js';
import { applyFunctionToEquality, knownSign } from '../../../js/engine/relations/applyToBothSides.js';
import { equalityFeatures, equalityDeclarations } from '../../../js/rules/equality/rule.js';
import { assertAstInvariants } from '../../../js/documents/documentInvariants.js';
import { RELATIONS } from '../../../js/definitions/relations/relations.js';

const apply = (statement, operand, context, options) =>
  applyFunctionToEquality(parseExpression(statement), parseExpression(operand), context, options);
const shown = result => expressionToDisplayString(result.root);

test('the sign of a number is known; the sign of an expression is not', () => {
  assert.equal(knownSign(parseExpression('3')), 'positive');
  assert.equal(knownSign(parseExpression('-2')), 'negative');
  assert.equal(knownSign(parseExpression('0')), 'zero');
  assert.equal(knownSign(parseExpression('1÷4')), 'positive');
  assert.equal(knownSign(parseExpression('c')), null);
  assert.equal(knownSign(parseExpression('x-x')), null, 'no hidden simplification');
});

test('multiplying an inequality by a number keeps it, flips it, or (by 0) gives an equality', () => {
  const byThree = apply('a<b', '3', 'multiply-left');
  assert.equal(shown(byThree), '3 a < 3 b');
  assert.equal(byThree.relationChange, 'same');
  const byMinusTwo = apply('a<b', '-2', 'multiply-left');
  assert.equal(byMinusTwo.root.type, 'Greater');
  assert.equal(byMinusTwo.relationChange, 'converse');
  assert.equal(byMinusTwo.assumptions, undefined, 'a known sign needs no assumption');
  const byZero = apply('a<b', '0', 'multiply-left');
  assert.equal(byZero.root.type, 'Equal');
  assert.equal(apply('x>1', '-1', 'multiply-right').root.type, 'Less');
  for (const result of [byThree, byMinusTwo, byZero]) assertAstInvariants(result.root);
});

test('an unknown sign asks; each answer gives its relation and is recorded as the assumption', () => {
  const asked = apply('a<b', 'c', 'multiply-left');
  assert.equal(asked.needsSign, true);
  assert.equal(asked.root, undefined);
  assert.equal(asked.operandText, 'c');
  assert.deepEqual(asked.effects, { positive: 'same', zero: 'equal', negative: 'converse' });
  const cases = { positive: ['Less', 'c > 0'], zero: ['Equal', 'c = 0'], negative: ['Greater', 'c < 0'] };
  for (const [sign, [type, text]] of Object.entries(cases)) {
    const result = apply('a<b', 'c', 'multiply-left', { sign });
    assert.equal(result.root.type, type, sign);
    assert.equal(result.assumptions[0].text, text);
    assert.equal(result.assumptions[0].kind, 'sign');
  }
});

test('adding keeps every relation; an equation multiplies without a question', () => {
  assert.equal(shown(apply('a<b', 'c', 'add-right')), 'a + c < b + c');
  assert.equal(shown(apply('a=b', 'c', 'multiply-left')), 'c a = c b');
  assert.equal(apply('a=b', 'c', 'multiply-left').needsSign, undefined);
});

test('the rule serves every relation in the registry, naming none itself', () => {
  assert.deepEqual(equalityDeclarations.map(d => d.on.ownerType).sort(), RELATIONS.list.map(r => r.node).sort());
  const [feature] = equalityFeatures;
  const root = parseExpression('a<b');
  const asked = feature.propose(root, { relationId: root.id, context: 'multiply-left', operandRoot: parseExpression('c') });
  assert.equal(asked.needsSign, true);
  const answered = feature.propose(root, { relationId: root.id, context: 'multiply-left', operandRoot: parseExpression('c'), sign: 'negative' });
  assert.equal(answered.root.type, 'Greater');
});
