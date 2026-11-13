/**
 * Exact numbers across the Engine: parsing, combining, comparing, display and
 * documents saved before numbers became exact. Defects D3 and D4 are covered here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToInput, expressionToDisplayString } from '../../js/engine/parser.js';
import { combineNumericAddends } from '../../js/engine/operations/addition.js';
import { combineNumericFactors } from '../../js/engine/operations/multiplication.js';
import { evaluateEquality } from '../../js/engine/relations/equality.js';
import { structurallyEqual } from '../../js/engine/structuralEquality.js';
import { startsWithSign } from '../../js/engine/operatorMetadata.js';
import { toMathJSON } from '../../js/engine/mathJson.js';
import { assertAstInvariants } from '../../js/documents/documentInvariants.js';
import { MAX_DIGITS } from '../../js/engine/rational.js';

const combineFirstTwo = (source, combine) => {
  const root = parseExpression(source);
  const result = combine(root, root.operands[1].id, root.operands[0]);
  return result?.value ?? null;
};

test('D3: large integers combine exactly and display as typed', () => {
  assert.equal(combineFirstTwo('1000000000000+1', combineNumericAddends), '1000000000001');
  assert.equal(combineFirstTwo('1234567890123+1', combineNumericAddends), '1234567890124');
  const typed = parseExpression('1234567890123+1');
  assert.equal(expressionToInput(typed), '1234567890123+1');
  assert.equal(expressionToDisplayString(typed), '1234567890123 + 1');
});

test('decimals combine exactly, with no floating-point noise', () => {
  assert.equal(combineFirstTwo('0.1+0.2', combineNumericAddends), '0.3');
  assert.equal(combineFirstTwo('0.1*0.2', combineNumericFactors), '0.02');
  assert.equal(combineFirstTwo('1.1*1.1', combineNumericFactors), '1.21');
});

test('D4: equality compares assigned values exactly', () => {
  const result = evaluateEquality(parseExpression('a+b=c'), { a: '0.1', b: '0.2', c: '0.3' });
  assert.equal(result.status, 'true');
  // Values saved before the change are plain numbers; they compare exactly too.
  assert.equal(evaluateEquality(parseExpression('a+b=c'), { a: 0.1, b: 0.2, c: 0.3 }).status, 'true');
  assert.equal(evaluateEquality(parseExpression('0.3=0.30'), {}).status, 'true');
});

test('numbers too large to work with are refused, not rounded', () => {
  const big = '9'.repeat(MAX_DIGITS);
  assert.equal(combineFirstTwo(`${big}*${big}`, combineNumericFactors), null);
  assert.throws(() => parseExpression(`1e${MAX_DIGITS + 5}`), /too large/);
});

test('a typed minus before a number still makes one negative Number', () => {
  // A lone number parses to that Number as the root.
  const number = parseExpression('-0.5');
  assert.equal(number.type, 'Number');
  assert.equal(number.value, '-0.5');
  assert.equal(startsWithSign(number), true);
});

test('older saved numbers are still valid and compare by exact value', () => {
  const legacy = { id: 'node-1', type: 'Number', value: 0.1 };
  assert.doesNotThrow(() => assertAstInvariants(legacy));
  assert.ok(structurallyEqual(legacy, parseExpression('0.10')));
  assert.throws(() => assertAstInvariants({ id: 'node-2', type: 'Number', value: 'abc' }), /invalid number/);
  // Infinity is not JSON at all, so the earlier JSON check refuses it first.
  assert.throws(() => assertAstInvariants({ id: 'node-3', type: 'Number', value: Infinity }), /finite/);
});

test('MathJSON keeps plain numbers when exact, and a string form when not', () => {
  assert.equal(toMathJSON(parseExpression('0.25')), 0.25);
  const long = parseExpression('12345678901234567890');
  assert.deepEqual(toMathJSON(long), { num: '12345678901234567890' });
});

test('a too-large result explains itself, ready for a future hint', async () => {
  const { explainAdditionRejection, getAdditionCombination } = await import('../../js/engine/operations/addition.js');
  const { explainMultiplicationRejection } = await import('../../js/engine/operations/multiplication.js');
  const { describeRejection } = await import('../../js/engine/ruleRejections.js');
  const big = parseExpression(`${'9'.repeat(MAX_DIGITS)}*${'9'.repeat(MAX_DIGITS)}`);
  const [a, b] = big.operands;
  assert.deepEqual(explainMultiplicationRejection(a, b), { reason: 'number-too-large', message: 'Number is too large' });
  // An ordinary combination has no rejection, and the plan contract is unchanged.
  const small = parseExpression('2+3');
  assert.equal(explainAdditionRejection(small.operands[0], small.operands[1]), null);
  assert.equal(getAdditionCombination(small.operands[0], small.operands[1]).value, '5');
  // A sum can also grow past the limit.
  const sum = parseExpression(`${'9'.repeat(MAX_DIGITS)}+1`);
  assert.equal(explainAdditionRejection(sum.operands[0], sum.operands[1])?.message, 'Number is too large');
  // The equality check reports the same reason, so one message serves both.
  const equality = evaluateEquality(parseExpression('a*a=1'), { a: '9'.repeat(MAX_DIGITS) });
  assert.equal(describeRejection(equality.reason), 'Number is too large');
});
