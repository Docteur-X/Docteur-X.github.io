/** Exact rational arithmetic: the Engine must never round silently. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseExact, add, multiply, negate, compare, equals, isZero, isNegative,
  toExactString, isExactNumberInput, NumberTooLargeError, MAX_DIGITS
} from '../../js/engine/rational.js';

test('decimals are exact: 0.1 + 0.2 is exactly 0.3', () => {
  assert.equal(toExactString(add('0.1', '0.2')), '0.3');
  assert.ok(equals(add('0.1', '0.2'), '0.3'));
});

test('large integers keep every digit (defect D3)', () => {
  assert.equal(toExactString(add('1234567890123', '1')), '1234567890124');
  assert.equal(toExactString(add('1000000000000', '1')), '1000000000001');
  assert.equal(toExactString('123456789012345678901234567890'), '123456789012345678901234567890');
});

test('stored form shows every digit, with no exponent notation', () => {
  assert.equal(toExactString('1e-7'), '0.0000001');
  assert.equal(toExactString('1.5e3'), '1500');
  assert.equal(toExactString('-0.250'), '-0.25');
  assert.equal(toExactString('-0'), '0');
  assert.equal(toExactString('.5'), '0.5');
});

test('values without a finite decimal are kept as fractions', () => {
  assert.equal(toExactString('2/6'), '1/3');
  assert.equal(toExactString(multiply('1/3', '3')), '1');
  assert.equal(toExactString('-4/8'), '-0.5');
});

test('numbers saved before the change load as the decimal they displayed', () => {
  assert.equal(toExactString(0.1), '0.1');
  assert.equal(toExactString(-3), '-3');
  assert.equal(toExactString(-0), '0');
  // No cleaning: an old float result loads exactly as it was stored.
  assert.equal(toExactString(0.1 + 0.2), '0.30000000000000004');
});

test('sign, zero, comparison and negation', () => {
  assert.ok(isNegative('-0.001'));
  assert.ok(!isNegative('0'));
  assert.ok(isZero('0.000'));
  assert.equal(compare('0.3', '1/3'), -1);
  assert.equal(compare('2', '2.0'), 0);
  assert.equal(toExactString(negate('-7')), '7');
});

test('invalid input is refused rather than guessed', () => {
  for (const bad of ['', '.', 'abc', '1/0', '--1', Infinity, NaN, null, undefined]) {
    assert.ok(!isExactNumberInput(bad), String(bad));
  }
  assert.throws(() => parseExact('1/0'), RangeError);
});

test('numbers too large to work with are refused with a clear error', () => {
  const huge = '9'.repeat(MAX_DIGITS);
  assert.doesNotThrow(() => parseExact(huge));
  assert.throws(() => multiply(huge, huge), NumberTooLargeError);
  assert.throws(() => parseExact('1e100000'), NumberTooLargeError);
  assert.throws(() => parseExact(`1e-${MAX_DIGITS + 1}`), NumberTooLargeError);
});
