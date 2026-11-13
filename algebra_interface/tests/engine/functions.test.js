// Stage E4a: defined functions, typed with a backslash and brackets always
// (owner decision, 12 November 2026): \sin(x). Stored as Apply.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToInput, expressionToDisplayString } from '../../js/engine/parser.js';
import { toCanonicalText } from '../../js/engine/canonicalText.js';
import { toMathJSON } from '../../js/engine/mathJson.js';
import { OPERATORS } from '../../js/definitions/operators/operators.js';
import { assertAstInvariants } from '../../js/documents/documentInvariants.js';

const canonical = input => toCanonicalText(parseExpression(input));

test('a defined function reads as Apply, and prints back with its backslash', () => {
  assert.equal(canonical('\\sin(x)'), 'Apply[operator=sin](x)');
  assert.equal(canonical('2\\sin(a+b)'), 'Multiply(2, Apply[operator=sin](Add(a, b)))');
  assert.equal(canonical('\\cos(x)\\sin(y)'), 'Multiply(Apply[operator=cos](x), Apply[operator=sin](y))');
  assert.equal(canonical('-\\sin(x)'), 'Negate(Apply[operator=sin](x))');
  assert.equal(canonical('\\sin(\\cos(x))'), 'Apply[operator=sin](Apply[operator=cos](x))');
  assert.equal(canonical('\\sin(x)=\\cos(y)'), 'Equal(Apply[operator=sin](x), Apply[operator=cos](y))');
  for (const input of ['\\sin(x)', '2 \\sin(a+b)', '\\ln((a))', '\\exp(-x)', '6÷2 \\sin(x)', '\\tan(x)·\\cos(x)']) {
    const tree = parseExpression(input);
    assertAstInvariants(tree);
    const text = expressionToInput(tree);
    assert.equal(expressionToInput(parseExpression(text)), text, input);
  }
  assert.equal(expressionToInput(parseExpression('\\sin(a+b)')), '\\sin(a+b)');
  assert.equal(expressionToDisplayString(parseExpression('\\sin(a+b)')), 'sin(a + b)');
  assert.deepEqual(toMathJSON(parseExpression('\\sin(x)')), ['Sin', 'x']);
});

test('brackets are always written, and only defined functions exist', () => {
  assert.throws(() => parseExpression('\\sin x'), /Write the brackets: \\sin\(…\)/);
  assert.throws(() => parseExpression('\\sin (x)'), /Write the brackets/);
  assert.throws(() => parseExpression('\\sin[x]'), /Write the brackets/);
  assert.throws(() => parseExpression('\\foo(x)'), /Unknown function “\\foo”. Defined functions: \\sin, \\cos, \\tan, \\ln, \\exp\./);
  assert.throws(() => parseExpression('\\'), /starts a function name/);
  // After a divisor, a function written straight on is as ambiguous as 6÷2x.
  assert.throws(() => parseExpression('6÷2\\sin(x)'), /ambiguous/);
  // Without the backslash, sin(x) keeps its old meaning: the symbol sin times (x).
  assert.equal(canonical('sin(x)'), 'Multiply(sin, Group(x))');
});

test('functions are operator definitions, one folder each', () => {
  const functions = OPERATORS.list.filter(operator => operator.kind === 'function').map(operator => operator.id);
  assert.deepEqual(functions, ['sin', 'cos', 'tan', 'ln', 'exp']);
  for (const id of functions) {
    const definition = OPERATORS.get(id);
    assert.equal(definition.appliedAs, 'Apply');
    assert.equal(definition.notation.function.name, id);
    assert.ok(!definition.properties.includes('linear'), `${id} is not linear`);
  }
});
