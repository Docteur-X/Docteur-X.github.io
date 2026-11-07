import { normaliseWithRules } from "../js/core/normalization.js";
import test from "node:test";
import assert from "node:assert/strict";

import { parseExpression, expressionToInput } from "../js/core/parser.js";
import { toMathJSON } from "../js/core/mathJson.js";
import { evaluateNumericNode, getUniqueSymbolNames } from "../js/core/treeUtils.js";
import { combineNumericAddends, reorderAddend } from "../js/operations/addition.js";
import { combineNumericFactors, reorderFactor } from "../js/operations/multiplication.js";

/*
 * These tests exercise the mathematical model without needing a browser.
 * The DOM renderer and pointer interactions are browser-facing; the parser,
 * tree, MathJSON converter and algebraic operation rules can be tested here.
 */

test("parses a sum into an Add root and separate Symbol nodes", () => {
  const tree = parseExpression("a+b+c");
  assert.equal(tree.type, "Add");
  assert.deepEqual(tree.operands.map((node) => node.type), ["Symbol", "Symbol", "Symbol"]);
  assert.deepEqual(toMathJSON(tree), ["Add", "a", "b", "c"]);
});

test("parses explicit and implicit multiplication styles", () => {
  const dotProduct = parseExpression("_a·_b").operands[0];
  const timesProduct = parseExpression("a×b").operands[0];
  const implicitProduct = parseExpression("_a _b").operands[0];

  assert.equal(dotProduct.type, "Multiply");
  assert.equal(dotProduct.displayStyle, "dot");
  assert.equal(timesProduct.displayStyle, "times");
  assert.equal(implicitProduct.displayStyle, "implicit");
});

test("does not split multi-letter identifiers or function-like names", () => {
  assert.equal(parseExpression("ab").operands[0].name, "ab");
  assert.equal(parseExpression("sin").operands[0].name, "sin");
  assert.deepEqual(toMathJSON(parseExpression("ab")), "ab");
});

test("whitespace-separated symbols are implicit factors and x remains a symbol", () => {
  const product = parseExpression("a x b").operands[0];
  assert.equal(product.type, "Multiply");
  assert.deepEqual(product.operands.map((node) => node.name), ["a", "x", "b"]);
});

test("preserves numeric negatives and negative addends", () => {
  assert.equal(parseExpression("-3").operands[0].value, -3);
  assert.equal(parseExpression("a+-2").operands[1].value, -2);
  assert.equal(parseExpression("-a").operands[0].type, "Negate");
});

test("parses subtraction as addition of negation; bracket grouping is preserved", () => {
  const subtracted = parseExpression("a-2");
  assert.equal(subtracted.operands[1].type, "Negate");
  assert.equal(subtracted.operands[1].operand.value, 2);
  assert.equal(parseExpression("(x)").operands[0].type, "Group");
  // Function calls remain future work. The existing identifier convention
  // interprets sin(x) as multiplication of symbol 'sin' by grouped 'x'.
  assert.equal(parseExpression("sin(x)").operands[0].type, "Multiply");
});

test("serialises the tree back into an unambiguous editable form", () => {
  const tree = parseExpression("_alpha + 2b");
  assert.equal(expressionToInput(tree), "_alpha+2 b");
});

test("addition can combine numeric addends", () => {
  const root = parseExpression("2+3");
  const moving = root.operands.splice(0, 1)[0];
  const result = combineNumericAddends(root, root.operands[0].id, moving);
  assert.equal(result.value, 5);
});

test("multiplication can combine numeric factors and normalise a one-factor product", () => {
  const root = parseExpression("2·3");
  const product = root.operands[0];
  const moving = product.operands.splice(0, 1)[0];
  const result = combineNumericFactors(product, product.operands[0].id, moving);
  assert.equal(result.value, 6);

  const normalised = normaliseWithRules(root);
  assert.equal(normalised.operands[0].type, "Number");
  assert.equal(normalised.operands[0].value, 6);
});

test("Add and Multiply nodes can reorder their own children", () => {
  const sum = parseExpression("a+b+c");
  assert.equal(reorderAddend(sum, sum.operands[0].id, 2), true);
  assert.deepEqual(sum.operands.map((node) => node.name), ["b", "c", "a"]);

  const product = parseExpression("a·b·c").operands[0];
  assert.equal(reorderFactor(product, product.operands[0].id, 2), true);
  assert.deepEqual(product.operands.map((node) => node.name), ["b", "c", "a"]);
});

test("symbol discovery traverses inside products", () => {
  const tree = parseExpression("2·_alpha + _beta×x");
  assert.deepEqual(getUniqueSymbolNames(tree), ["alpha", "beta", "x"]);
});

test("the numeric evaluator handles products and substitutions", () => {
  const product = parseExpression("2·_a·3").operands[0];
  assert.equal(evaluateNumericNode(product, { a: 4 }), 24);
  assert.equal(evaluateNumericNode(product, {}), null);
});
