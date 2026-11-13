/* ========================================================================== *
 * Exact rational numbers
 * ========================================================================== *
 * The Engine never rounds silently. A JavaScript number stores 0.1 only
 * approximately, so 0.1 + 0.2 is not exactly 0.3; this module stores every
 * number as an exact fraction of two integers instead.
 *
 * How a number is stored in the expression tree
 *   A Number node keeps an exact STRING in its `value`, such as "3", "-0.25"
 *   or "1234567890123". A string, not a BigInt, so that history, the
 *   clipboard and saving can keep copying the tree as ordinary JSON.
 *   Numbers saved before this change are plain JavaScript numbers; every
 *   function here also accepts those, reading them as the exact decimal
 *   they display as. Nothing needs migrating.
 *
 * Working values
 *   Arithmetic uses { numerator, denominator } BigInt pairs, always reduced,
 *   with a positive denominator. Convert back with toExactString().
 *
 * Future number systems
 *   Roots, pi, e and complex numbers are not rationals. They are meant to
 *   stay as expression nodes (for example a future Root or Constant node), so
 *   they never need rounding either. This module stays purely rational.
 *
 * This module knows nothing about the tree, the DOM or any rule.
 * ========================================================================== */

/**
 * Largest number of digits allowed in a numerator or denominator. BigInt
 * cannot overflow, but a huge number would make the page slow. Beyond this,
 * operations refuse with NumberTooLargeError instead of giving a wrong answer.
 */
export const MAX_DIGITS = 1000;

/** Thrown when an exact result would be too large to work with. */
export class NumberTooLargeError extends RangeError {
  constructor(message = `This number has more than ${MAX_DIGITS} digits, which is too large to work with.`) {
    super(message);
    this.name = 'NumberTooLargeError';
  }
}

const DECIMAL = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;
const FRACTION = /^([+-]?\d+)\/(\d+)$/;

function abs(value) { return value < 0n ? -value : value; }
function gcd(a, b) {
  a = abs(a); b = abs(b);
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}
function digits(value) { return abs(value).toString().length; }

/** Reduce, check the size limit, and return an exact value. */
function make(numerator, denominator) {
  if (denominator === 0n) throw new RangeError('A rational number cannot have a zero denominator.');
  if (denominator < 0n) { numerator = -numerator; denominator = -denominator; }
  const divisor = gcd(numerator, denominator) || 1n;
  numerator /= divisor;
  denominator /= divisor;
  if (digits(numerator) > MAX_DIGITS || digits(denominator) > MAX_DIGITS) throw new NumberTooLargeError();
  return Object.freeze({ numerator, denominator });
}

function isExact(value) {
  return value !== null && typeof value === 'object' &&
    typeof value.numerator === 'bigint' && typeof value.denominator === 'bigint';
}

/** Read a decimal such as "-12.5e-3" exactly. Returns null when not a decimal. */
function readDecimal(text) {
  const match = DECIMAL.exec(text);
  if (!match) return null;
  const [, sign, whole = '', fraction = '', exponentText] = match;
  if (!whole && !fraction) return null;
  const exponent = Number(exponentText ?? 0);
  // Refuse before building an enormous power of ten.
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > MAX_DIGITS) throw new NumberTooLargeError();
  let numerator = BigInt((whole || '0') + fraction);
  let denominator = 10n ** BigInt(fraction.length);
  if (exponent >= 0) numerator *= 10n ** BigInt(exponent);
  else denominator *= 10n ** BigInt(-exponent);
  return make(sign === '-' ? -numerator : numerator, denominator);
}

/**
 * Turn any accepted input into an exact value:
 * an exact value, a decimal or fraction string ("0.1", "1e-3", "-2/3"),
 * a BigInt, or a finite JavaScript number (read as the decimal it prints as).
 */
export function parseExact(input) {
  if (isExact(input)) return input;
  if (typeof input === 'bigint') return make(input, 1n);
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new TypeError(`A number must be finite; received ${input}.`);
    // String() gives the shortest decimal that identifies this number, which is
    // also what the student saw on screen. 0.1 becomes exactly 1/10.
    return readDecimal(String(Object.is(input, -0) ? 0 : input));
  }
  if (typeof input === 'string') {
    const text = input.trim();
    const fraction = FRACTION.exec(text);
    if (fraction) return make(BigInt(fraction[1]), BigInt(fraction[2]));
    const decimal = readDecimal(text);
    if (decimal) return decimal;
  }
  throw new TypeError(`“${input}” is not an exact number.`);
}

/** True when parseExact would accept the input. */
export function isExactNumberInput(input) {
  try { parseExact(input); return true; } catch { return false; }
}

export function add(a, b) {
  a = parseExact(a); b = parseExact(b);
  return make(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
}
export function multiply(a, b) {
  a = parseExact(a); b = parseExact(b);
  return make(a.numerator * b.numerator, a.denominator * b.denominator);
}
export function negate(a) {
  a = parseExact(a);
  return make(-a.numerator, a.denominator);
}
/** -1, 0 or 1, like a comparison function. */
export function compare(a, b) {
  a = parseExact(a); b = parseExact(b);
  const left = a.numerator * b.denominator, right = b.numerator * a.denominator;
  return left < right ? -1 : left > right ? 1 : 0;
}
export function equals(a, b) { return compare(a, b) === 0; }
export function isZero(a) { return parseExact(a).numerator === 0n; }
export function isNegative(a) { return parseExact(a).numerator < 0n; }

/**
 * The canonical stored form: a plain decimal when the value has one ("0.3",
 * "-12", "0.0000001"), otherwise a fraction ("1/3"). No exponent notation, so
 * the text always shows every digit of the exact value.
 */
export function toExactString(input) {
  const { numerator, denominator } = parseExact(input);
  // A fraction has a finite decimal exactly when its denominator has no prime
  // factor other than 2 and 5. Count how many decimal places it needs.
  let rest = denominator, twos = 0, fives = 0;
  while (rest % 2n === 0n) { rest /= 2n; twos += 1; }
  while (rest % 5n === 0n) { rest /= 5n; fives += 1; }
  if (rest !== 1n) return `${numerator}/${denominator}`;
  const places = Math.max(twos, fives);
  if (places === 0) return numerator.toString();
  const scaled = abs(numerator) * (10n ** BigInt(places)) / denominator;
  const text = scaled.toString().padStart(places + 1, '0');
  const sign = numerator < 0n ? '-' : '';
  return `${sign}${text.slice(0, -places)}.${text.slice(-places)}`;
}

/** Text for display. Currently the same as the stored form. */
export function formatExact(input) { return toExactString(input); }
