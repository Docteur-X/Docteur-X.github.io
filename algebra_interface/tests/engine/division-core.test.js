// Division as Invert (stages D1 and D2): the node, typing and printing, exact
// values, the leading-1 rule, the locked 1, and the zero-product guard.
// Design: Developer Documentation/06_Historical_Records/Superseded_2026-11-12/Division_Invert_Design_Draft.md (decisions: 00_Current/Decisions.md)
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToInput, expressionToDisplayString } from '../../js/engine/parser.js';
import { evaluateNumericNode } from '../../js/engine/treeUtils.js';
import { toExactString } from '../../js/engine/rational.js';
import { createMultiply, createNumber, createInvert } from '../../js/engine/nodeFactory.js';
import { restoreLeadingOne, hasBareDivision } from '../../js/engine/divisionInvariant.js';
import { createApplicationTransformationFeatures } from '../../js/app/transformationFeatureAssembly.js';
import { createTransformationCoordinator } from '../../js/steps/transformationCoordinator.js';

const coordinator = createTransformationCoordinator(createApplicationTransformationFeatures());
const input = source => expressionToInput(parseExpression(source));
const valueOf = (source, values = {}) => {
  const v = evaluateNumericNode(parseExpression(source), values);
  return v === null ? null : toExactString(v);
};

test('÷ and / both mean multiplying by the inverse, shown as ÷', () => {
  const root = parseExpression('a÷b×c');
  assert.deepEqual(root.operands.map(o => o.type), ['Symbol', 'Invert', 'Symbol']);
  assert.equal(input('a/b'), 'a/b');
  assert.equal(expressionToDisplayString(parseExpression('a/b')), 'a÷b');
  assert.equal(input('a÷b÷c'), 'a/b/c');
  assert.equal(input('a÷(b+c)'), 'a/(b+c)');
  assert.equal(input('a÷-b'), 'a/(-b)');
});

test('a leading ÷ and an ambiguous factor after a divisor are refused, with a reason', () => {
  assert.throws(() => parseExpression('÷b'), /something to divide/);
  assert.throws(() => parseExpression('a÷'), /needs a divisor/);
  assert.throws(() => parseExpression('6÷2x'), /ambiguous/);
  assert.throws(() => parseExpression('a÷b(c)'), /ambiguous/);
  // A space starts a new factor (owner, 12 November 2026): 6÷2 x is 6÷2×x.
  assert.equal(input('6÷2 x'), '6/2·x');
  assert.equal(input('a÷b (c+d)'), 'a/b·(c+d)');
  assert.equal(input('6÷(2x)'), '6/(2 x)');
  assert.equal(input('6÷2×x'), '6/2×x');
});

test('the printer never writes the ambiguous form, so everything reads back', () => {
  // 6÷2·x stored with implicit multiplication still prints a sign.
  const product = createMultiply([createNumber(6), createInvert(createNumber(2)), { id: 'x1', type: 'Symbol', name: 'x' }]);
  assert.equal(expressionToInput(product), '6/2·x');
  // A fraction-valued divisor is bracketed: a÷(2/3), never a/2/3 (= a÷2÷3).
  const divisor = createMultiply([{ id: 'a1', type: 'Symbol', name: 'a' }, createInvert(createNumber('2/3'))]);
  assert.equal(expressionToInput(divisor), 'a/(2/3)');
  assert.equal(valueOf(expressionToInput(divisor), { a: '2' }), '3');
});

test('values are exact, and division by zero has no value', () => {
  assert.equal(valueOf('6÷4'), '1.5');
  assert.equal(valueOf('1÷3'), '1/3');
  assert.equal(valueOf('a÷b', { a: '2', b: '-4' }), '-0.5');
  assert.equal(valueOf('6÷0'), null);
  assert.equal(valueOf('6÷(2-2)'), null);
});

test('the leading-1 rule: a product never starts with ÷', () => {
  const b = { id: 'b', type: 'Symbol', name: 'b' };
  const a = { id: 'a', type: 'Symbol', name: 'a' };
  // ÷b moved to the front: a new 1 leads.
  const front = restoreLeadingOne(createMultiply([createInvert(b), a]));
  assert.equal(expressionToInput(front.root), '1/b·a');
  // The 1 moved to the end: another new 1 leads (owner's answer 1).
  const end = restoreLeadingOne(createMultiply([createInvert(b), a, createNumber(1)]));
  assert.equal(expressionToInput(end.root), '1/b·a 1');
  // A product that collapsed to ÷b on its own: 1÷b.
  assert.equal(expressionToInput(restoreLeadingOne(createInvert(b)).root), '1/b');
  // A correct tree is left exactly as it was.
  const fine = parseExpression('1÷b×a');
  assert.equal(restoreLeadingOne(fine).changed, false);
  assert.equal(hasBareDivision(fine), false);
});

test('the locked 1: a step that only removes it is refused (it would come straight back)', () => {
  const root = parseExpression('1÷b×a');
  const [one, , a] = root.operands;
  // Drop the 1 onto a: numeric combination would remove it, the rule restores it.
  assert.equal(coordinator.propose(root, { ruleId: 'multiplication.combine-numeric',
    parameters: { parentId: root.id, movingNodeId: one.id, targetNodeId: a.id } }), null);
});

test('numeric division combines exactly: 6÷2 → 3, 1÷2 → 0.5, 1÷3 → 1/3', () => {
  for (const [source, expected] of [['6÷2', '3'], ['1÷2', '0.5'], ['1÷3', '1/3']]) {
    const root = parseExpression(source);
    const [first, divisor] = root.operands;
    const candidate = coordinator.propose(root, { ruleId: 'multiplication.combine-numeric',
      parameters: { parentId: root.id, movingNodeId: divisor.id, targetNodeId: first.id } });
    assert.equal(expressionToInput(candidate.result.root), expected, source);
  }
  // Division by zero is refused.
  const zero = parseExpression('6÷0');
  assert.equal(coordinator.propose(zero, { ruleId: 'multiplication.combine-numeric',
    parameters: { parentId: zero.id, movingNodeId: zero.operands[1].id, targetNodeId: zero.operands[0].id } }), null);
});

test('0 × a product with a divisor is 0, assuming the divisor is nonzero (D3)', () => {
  const propose = source => {
    const root = parseExpression(source);
    const [zero, other] = root.operands;
    return coordinator.propose(root, { ruleId: 'multiplication.combine-numeric',
      parameters: { parentId: root.id, movingNodeId: zero.id, targetNodeId: other.id } });
  };
  const symbolic = propose('0a÷b');
  assert.equal(expressionToInput(symbolic.result.root), '0');
  assert.deepEqual(symbolic.result.assumptions.map(a => a.text), ['b ≠ 0']);
  // A known nonzero divisor needs no assumption; a known zero divisor is refused.
  assert.deepEqual(propose('0a÷2').result.assumptions, []);
  assert.equal(propose('0a÷0'), null);
});
