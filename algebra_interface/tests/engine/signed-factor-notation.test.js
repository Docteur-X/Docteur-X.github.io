/**
 * Notation contract (defects D1 and D2): printed text must mean what the tree
 * means. A signed factor after the first needs a visible multiplication sign,
 * otherwise `a -c` reads and reparses as subtraction. This is display only:
 * the tree and its displayStyle are not changed by printing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToInput, expressionToDisplayString } from '../../js/engine/parser.js';
import { evaluateNumericNode } from '../../js/engine/treeUtils.js';
import { normaliseWithRules } from '../../js/engine/normalization.js';
import { getDistributionPlan, applyDistribution, unwrapGroupedSum } from '../../js/engine/operations/distribution.js';
import { removeGroup } from '../../js/engine/operations/grouping.js';
import { applyFunctionToEquality } from '../../js/engine/relations/applyToBothSides.js';
import { toExactString } from '../../js/engine/rational.js';
// Exact numbers compare as their exact text, such as '24' or '-0.5'.
const exact = value => value === null ? null : toExactString(value);

const VALUES = { a: 7, b: 3, c: 11, x: 5 };
const value = node => exact(evaluateNumericNode(node, VALUES));

function distribute(source) {
  const root = parseExpression(source);
  const sumFactor = root.operands.find(factor => unwrapGroupedSum(factor));
  const factor = root.operands.find(item => item !== sumFactor);
  const plan = getDistributionPlan(root, factor.id, unwrapGroupedSum(sumFactor).id);
  return normaliseWithRules(applyDistribution(root, plan).root);
}

test('a signed factor after the first shows a multiplication sign', () => {
  assert.equal(expressionToDisplayString(distribute('a(b-c)')), 'a b + a · −c');
  assert.equal(expressionToDisplayString(distribute('2(-3+x)')), '2 · -3 + 2 x');
});

test('a signed first factor and explicit brackets need no added sign', () => {
  assert.equal(expressionToDisplayString(parseExpression('-a b')), '−a b');
  assert.equal(expressionToDisplayString(parseExpression('a(-c)')), 'a (−c)');
});

test('a chosen multiplication style is kept for signed factors', () => {
  const root = parseExpression('a×(-3)');
  const result = normaliseWithRules(removeGroup(root, root.operands[1].id) && root);
  assert.equal(expressionToDisplayString(result), 'a × -3');
});

test('printing does not change the stored display style', () => {
  const root = distribute('a(b-c)');
  const before = JSON.stringify(root);
  expressionToDisplayString(root);
  expressionToInput(root);
  assert.equal(JSON.stringify(root), before);
  assert.equal(root.operands[1].displayStyle, 'implicit');
});

test('the parser reads a signed factor after a multiplication sign', () => {
  assert.equal(value(parseExpression('a*-b')), '-21');
  assert.equal(value(parseExpression('2*-3')), '-6');
  assert.equal(value(parseExpression('a·-c·-b')), '231');
  assert.throws(() => parseExpression('a*-'), /needs an expression/);
  assert.throws(() => parseExpression('a*'), /needs a factor/);
});

test('whitespace without a sign is still subtraction', () => {
  assert.equal(value(parseExpression('a -c')), '-4');
});

test('editable text rebuilds to the same value on every route to a signed factor', () => {
  const removed = source => {
    const root = parseExpression(source);
    return normaliseWithRules(removeGroup(root, root.operands[1].id) && root);
  };
  const equality = operand => applyFunctionToEquality(parseExpression('a=c'),
    parseExpression(operand), 'multiply-right').root.left;
  const cases = [distribute('a(b-c)'), distribute('2(x-3)'), distribute('2(-3+x)'),
    distribute('(b-c)a'), distribute('a*(b-c)'), removed('a[-3]'), removed('a(-b)'),
    removed('a*(-3)'), equality('-3'), equality('-b')];
  for (const tree of cases) {
    const text = expressionToInput(tree);
    assert.equal(value(parseExpression(text)), value(tree), `changed value: ${text}`);
  }
});
