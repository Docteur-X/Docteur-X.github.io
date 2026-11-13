// Engine stage E2: the table-driven parser and printer behave exactly like the
// parser before E2 (frozen in tests/helpers/legacyParser.js). For every input
// both give the same tree, or the same error message; every tree prints the
// same text in both modes.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as current from '../../js/engine/parser.js';
import * as legacy from '../helpers/legacyParser.js';
import { fromCanonicalText } from '../../js/engine/canonicalText.js';
import { setAdditionAssociative } from '../../js/engine/operations/addition.js';
import { setMultiplicationAssociative } from '../../js/engine/operations/multiplication.js';

const withoutIds = node => JSON.parse(JSON.stringify(node, (key, value) => key === 'id' ? undefined : value));

function outcome(parser, input) {
  try { return { tree: withoutIds(parser.parseExpression(input)) }; }
  catch (error) { return { error: error.message }; }
}

// A small seeded generator, so a failure always reproduces.
function generator(seed) {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
}
const PIECES = ['a', 'b', 'x', 'y', 'ab', '_ab', '_θ', 'β', '2', '3', '0', '0.5', '.5', '1e3', '12', '+', '-', '--', '*', '×',
  '·', '⋅', '÷', '/', '(', ')', '[', ']', '{', '}', ' ', ' ', '=', '|', '<', '?', '−', '2x', 'x2'];

const HAND_PICKED = ['', ' ', 'a', '-3', '--3', '+-a', 'a+b', 'a-b', 'a+-b', 'a*-b', 'a×-b', '2x-3=y', 'a÷b', '6÷2x', '6÷2 x',
  '6÷(2x)', '/a', 'a/', 'a÷', 'a+', '-', '(a', 'a)', '(]', '()', '[a+b]c', '{a}{b}', 'a=b=c', '(a=b)', '=a', 'a=',
  'a b', 'ab', '2(a+b)', '(a+b)(c+d)', '(a+b)c', 'a(b+c)', 'a·b×c', 'a×b·c', '1/3', '1/3/4', 'a÷-b', 'a÷÷b', '|a|',
  'a<b', '1e400', '99999999999999999999999999999999999999999999999999999999999999999999999999999999', 'x−y', '3 .5'];

function inputs(count, seed) {
  const random = generator(seed);
  const list = [...HAND_PICKED];
  for (let i = 0; i < count; i++) {
    const length = 1 + Math.floor(random() * 9);
    list.push(Array.from({ length }, () => PIECES[Math.floor(random() * PIECES.length)]).join(''));
  }
  return list;
}

function compareAll(label) {
  let parsed = 0;
  for (const input of inputs(6000, 20261112)) {
    // < and > were reserved before stage E4c and are relations now: a
    // deliberate change, tested in tests/definitions/relations.test.js.
    if (/[<>]/.test(input)) continue;
    const a = outcome(legacy, input), b = outcome(current, input);
    assert.deepEqual(b, a, `${label}: ${JSON.stringify(input)}`);
    if (a.tree) {
      parsed++;
      const tree = current.parseExpression(input);
      for (const mode of ['expressionToInput', 'expressionToDisplayString']) {
        assert.equal(current[mode](tree), legacy[mode](tree), `${label} ${mode}: ${JSON.stringify(input)}`);
      }
    }
  }
  return parsed;
}

test('the table-driven parser gives the same tree or the same error as before E2', () => {
  const parsed = compareAll('associative');
  assert.ok(parsed > 500, `only ${parsed} inputs parsed; the corpus should exercise successful parses too`);
});

test('the same holds with associativity switched off (left-nested sums and products)', () => {
  setAdditionAssociative(false);
  setMultiplicationAssociative(false);
  try { compareAll('non-associative'); }
  finally { setAdditionAssociative(true); setMultiplicationAssociative(true); }
});

test('trees no input produces (from rules) print the same as before E2', () => {
  const trees = ['Add(a, Invert(b))', 'Multiply(Add(a, b), c)', 'Multiply(a, Negate(b))', 'Multiply(Invert(b), a)',
    'Negate(Negate(a))', 'Invert(Add(a, b))', 'Multiply(a, Invert(Multiply(b, c)))', 'Multiply(a, Invert(1/3))',
    'Add(Add(a, b), c)', 'Multiply(Multiply(a, Invert(b)), c)', 'Multiply[displayStyle=dot](a, Multiply(b, c))',
    // Apply is left out: since E4 its editable text has the backslash of a
    // defined function (owner decision), tested in tests/engine/functions.test.js.
    'Equal(Add(a, b), Multiply(-2, c))', 'Group[bracketStyle=curly](a)',
    'Multiply(-3, a)', 'Multiply(a, -3)', 'Add(-1/2, x)', '"long name"'];
  for (const text of trees) {
    const tree = fromCanonicalText(text);
    for (const mode of ['expressionToInput', 'expressionToDisplayString']) {
      assert.equal(current[mode](tree), legacy[mode](tree), `${mode}: ${text}`);
    }
  }
});

// Prevention (E2): the parser and printer read every sign from the notation
// table (js/engine/notation.js). A quoted sign or node type name in parser.js
// would mean notation is being written into the parser again.
import { readFileSync } from 'node:fs';
test('parser.js names no sign and no node type: notation lives in the table', () => {
  const source = readFileSync(new URL('../../js/engine/parser.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const quotedSign = source.match(/(["'])[+\-×·⋅*÷\/=()[\]{}<>|]\1/g) ?? [];
  const nodeNames = source.match(/["'](Add|Multiply|Negate|Invert|Group|Equal|Apply|Number|Symbol)["']/g) ?? [];
  assert.deepEqual([...quotedSign, ...nodeNames], []);
});
