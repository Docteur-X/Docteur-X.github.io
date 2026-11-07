import { normaliseWithRules } from "../js/core/normalization.js";
/* ========================================================================== *
 * Nested algebra, explicit Group nodes and future-ready precedence tests.
 * ========================================================================== *
 * These are mathematical-model tests. They do NOT use a browser.
 * We deliberately check the IDs and the exact tree shape, not only displayed
 * text: the renderer and drag logic must be able to address nested nodes.
 * ========================================================================== */
import test from "node:test";
import assert from "node:assert/strict";

import { createAdd, createGroup, createMultiply, createSymbol, cloneExpression } from "../js/core/nodeFactory.js";
import { parseExpression, expressionToInput, expressionToDisplayString } from "../js/core/parser.js";
import { toMathJSON } from "../js/core/mathJson.js";
import { needsAutomaticBrackets } from "../js/core/operatorMetadata.js";
import {
  evaluateNumericNode, findNodeLocation, getUniqueSymbolNames,
  walkExpression
} from "../js/core/treeUtils.js";
import { wrapNodeInGroup, removeGroup } from "../js/operations/grouping.js";
import { canCombineAddends, combineNumericAddends, reorderAddend } from "../js/operations/addition.js";
import { canCombineFactors, combineNumericFactors, reorderFactor } from "../js/operations/multiplication.js";

const complex = "2+(3*(4*5+6)*(7+8))";

test("parses the requested complex expression with nested Add, Multiply and Group", () => {
  const root = parseExpression(complex);
  const outerGroup = root.operands[1];
  assert.equal(outerGroup.type, "Group");
  assert.equal(outerGroup.bracketStyle, "round");
  const outerProduct = outerGroup.operand;
  assert.equal(outerProduct.type, "Multiply");
  assert.equal(outerProduct.operands.length, 3);
  assert.equal(outerProduct.operands[1].type, "Group");
  assert.equal(outerProduct.operands[1].operand.type, "Add");
  assert.equal(outerProduct.operands[1].operand.operands[0].type, "Multiply");
  assert.equal(outerProduct.operands[2].operand.type, "Add");
  assert.deepEqual(toMathJSON(root), ["Add", 2, ["Multiply", 3, ["Add", ["Multiply", 4, 5], 6], ["Add", 7, 8]]]);
});

test("round, square and curly groups retain their individual display styles", () => {
  const source = "2+[3*{4*5+6}*(7+8)]";
  const root = parseExpression(source);
  assert.equal(root.operands[1].bracketStyle, "square");
  assert.equal(root.operands[1].operand.operands[1].bracketStyle, "curly");
  assert.equal(root.operands[1].operand.operands[2].bracketStyle, "round");
  const restored = parseExpression(expressionToInput(root));
  assert.deepEqual(toMathJSON(restored), toMathJSON(root));
  assert.equal(restored.operands[1].bracketStyle, "square");
  assert.equal(restored.operands[1].operand.operands[1].bracketStyle, "curly");
  assert.match(expressionToInput(root), /\[.*\{.*\}.*\]/);
});

test("all three styles work around a lone variable and even multiple nested groups", () => {
  const root = parseExpression("(([x]))");
  assert.equal(root.operands[0].type, "Group");
  assert.equal(root.operands[0].operand.type, "Group");
  assert.equal(root.operands[0].operand.operand.type, "Group");
  assert.equal(expressionToInput(root), "(([x]))");
  assert.deepEqual(toMathJSON(root), "x");
});

test("the parser accepts adjacent grouped factors without splitting multi-letter names", () => {
  assert.equal(parseExpression("(a+b)(c+d)").operands[0].type, "Multiply");
  assert.equal(parseExpression("2(a+b)").operands[0].type, "Multiply");
  assert.equal(parseExpression("(a+b)c").operands[0].type, "Multiply");
  assert.equal(parseExpression("[a+b]{c+d}").operands[0].type, "Multiply");
  assert.equal(parseExpression("ab").operands[0].name, "ab");
});

test("bracket mismatch, missing bracket, stray closing, empty group and reserved characters have useful errors", () => {
  const bad = [
    ["(a+b]", /Expected “\)”/], ["{a+(b]}", /Expected “\)”/],
    ["(a+b", /Missing “\)”/], ["a+b)", /Unmatched closing bracket/],
    ["()", /Empty bracket pair/], ["[ ]", /Empty bracket pair/],
    ["|a|", /reserved/], ["a<b", /reserved/], ["a>b", /reserved/],
    ["2*(a+)", /needs an expression/]
  ];
  for (const [source, pattern] of bad) {
    assert.throws(() => parseExpression(source), pattern, source);
  }
});

test("nested numbers evaluate through explicit groups, even inside larger sums/products", () => {
  assert.equal(evaluateNumericNode(parseExpression("(1)+2")), 3);
  assert.equal(evaluateNumericNode(parseExpression("2+(3*(4*5+6)*(7+8))")), 1172);
  assert.equal(evaluateNumericNode(parseExpression("(2+3)*[x+1]"), { x: 4 }), 25);
  assert.equal(evaluateNumericNode(parseExpression("(2+3)*[x+1]")), null);
});

test("nested drag reordering is scoped to a particular Add or Multiply node", () => {
  const root = parseExpression(complex);
  const top = root.operands;
  reorderAddend(root, top[0].id, 1);
  assert.equal(root.operands[1].value, 2);
  const outerProduct = root.operands[0].operand;
  const three = outerProduct.operands[0];
  reorderFactor(outerProduct, three.id, 2);
  assert.equal(outerProduct.operands[2].value, 3);

  const innerProduct = outerProduct.operands[0].operand.operands[0];
  assert.equal(innerProduct.type, "Multiply");
  const four = innerProduct.operands[0];
  reorderFactor(innerProduct, four.id, 1);
  assert.deepEqual(innerProduct.operands.map((n) => n.value), [5, 4]);
  const lastSum = outerProduct.operands[1].operand;
  const seven = lastSum.operands[0];
  reorderAddend(lastSum, seven.id, 1);
  assert.deepEqual(lastSum.operands.map((n) => n.value), [8, 7]);

  const location = findNodeLocation(root, four.id);
  assert.equal(location.parent.id, innerProduct.id);
  assert.equal(location.index, 1);
  assert.equal(root.operands[0].type, "Group");
});

test("automatic parentheses prevent misreading Add below Multiply but not vice versa", () => {
  const a = createSymbol("a");
  const b = createSymbol("b");
  const c = createSymbol("c");
  const sum = createAdd([a,b]);
  const product = createMultiply([sum, c]);
  assert.equal(needsAutomaticBrackets(product, sum, 0), true);
  assert.equal(needsAutomaticBrackets(createAdd([product, c]), product, 0), false);
  assert.equal(expressionToInput(product), "(a+b) c");
});

test("adding/removing a Group is reversible; an Add inside Multiply remains parenthesised", () => {
  const root = parseExpression("a(b+c)");
  const product = root.operands[0];
  const originalGroup = product.operands[1];
  const sum = removeGroup(root, originalGroup.id);
  assert.equal(sum.type, "Add");
  assert.equal(product.operands[1], sum);
  assert.equal(expressionToInput(root), "a (b+c)"); // mandatory parentheses
  const newGroup = wrapNodeInGroup(root, sum.id, "square");
  assert.equal(newGroup.bracketStyle, "square");
  assert.equal(expressionToInput(root), "a [b+c]");
});

test("explicit groups survive normalisation; unwrapped same-type operations flatten", () => {
  const root = parseExpression("(a+b)+c");
  normaliseWithRules(root);
  assert.equal(root.operands[0].type, "Group");
  assert.equal(root.operands.length, 2);
  removeGroup(root, root.operands[0].id);
  normaliseWithRules(root);
  assert.deepEqual(root.operands.map((n) => n.name), ["a", "b", "c"]);
});

test("Group can be wrapped around a single variable, then wrapped again", () => {
  const root = parseExpression("x+y");
  const xId = root.operands[0].id;
  const first = wrapNodeInGroup(root, xId, "curly");
  const second = wrapNodeInGroup(root, first.id, "round");
  assert.equal(expressionToInput(root), "({x})+y");
  assert.equal(second.operand.id, first.id);
  removeGroup(root, second.id);
  assert.equal(expressionToInput(root), "{x}+y");
});

test("(1)+2 combines numerically without first removing the explicit Group", () => {
  const root = parseExpression("(1)+2");
  const moving = root.operands.splice(0,1)[0];
  assert.equal(canCombineAddends(root.operands[0], moving), true);
  assert.equal(combineNumericAddends(root, root.operands[0].id, moving).value, 3);
  assert.equal(root.operands[0].value, 3);
});

test("literal zero and one identity rules work both drag directions with symbols", () => {
  for (const text of ["0+a", "a+0", "(0)+a", "a+[0]"]) {
    const root = parseExpression(text);
    const moving = root.operands.splice(0, 1)[0];
    const target = root.operands[0];
    assert.equal(canCombineAddends(target, moving), true, text);
    const result = combineNumericAddends(root, target.id, moving);
    assert.equal(result.result.type, "Symbol", text);
    assert.equal(result.result.name, "a", text);
  }
  for (const text of ["0*a", "a*0", "1*a", "a*1", "(1)*a", "a*[0]"]) {
    const root = parseExpression(text);
    const product = root.operands[0];
    const moving = product.operands.splice(0, 1)[0];
    const target = product.operands[0];
    assert.equal(canCombineFactors(target, moving), true, text);
    combineNumericFactors(product, target.id, moving);
    normaliseWithRules(root);
    assert.equal(root.operands[0].type, text.includes("0") ? "Number" : "Symbol", text);
  }
});

test("zero times any remaining factors collapses whole product only when combined", () => {
  const root = parseExpression("0*a*b");
  const product = root.operands[0];
  const moving = product.operands.splice(0,1)[0];
  combineNumericFactors(product, product.operands[0].id, moving);
  normaliseWithRules(root);
  assert.equal(root.operands[0].value, 0);
});

test("whole products remain numerically combinable as addends", () => {
  const root = parseExpression("2*3*4+4*5*6+6*7*8");
  const moving = root.operands.splice(0, 1)[0];
  assert.equal(canCombineAddends(root.operands[0], moving), true);
  const result = combineNumericAddends(root, root.operands[0].id, moving);
  assert.equal(result.value, 144);
  assert.equal(root.operands[0].value, 144);
  assert.equal(evaluateNumericNode(root.operands[1]), 336);
});

test("IDs are stable across rearrangements and history cloning", () => {
  const root = parseExpression("(a+b)*c");
  const saved = cloneExpression(root);
  assert.deepEqual(saved, root);
  assert.notEqual(saved, root);
  const ids = [];
  walkExpression(root, n => ids.push(n.id));
  assert.equal(new Set(ids).size, ids.length);
  const product = root.operands[0];
  reorderFactor(product, product.operands[0].id, 1);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(getUniqueSymbolNames(root).sort(), ["a", "b", "c"]);
});

/* -------------------------------------------------------------------------- *
 * Renderer structural test using an extremely small mock document.
 * This checks the recursively generated DOM tree and explicit bracket text;
 * visual hover/dragging still needs a real browser for end-to-end testing.
 * -------------------------------------------------------------------------- */
import { renderExpression } from "../js/rendering/domRenderer.js";

class MockElement {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.dataset = {};
    this.className = "";
    this.attributes = {};
    this.classList = { add: (...names) => this.className += ` ${names.join(" ")}` };
  }
  append(...children) { this.children.push(...children); }
  setAttribute(name,value) { this.attributes[name] = value; }
  get textContent() { return this._text || this.children.map(child => child.textContent).join(""); }
  set textContent(value) { this._text = value; }
}

function allElements(root, predicate) {
  const results = [];
  function visit(node) {
    if (predicate(node)) results.push(node);
    for (const child of node.children) visit(child);
  }
  visit(root);
  return results;
}

test("DOM rendering preserves all explicit bracket glyphs INSIDE their hitboxes", () => {
  const originalDocument = globalThis.document;
  try {
    globalThis.document = { createElement: (tag) => new MockElement(tag) };
    const root = parseExpression("2+[3*{4*5+6}*(7+8)]");
    const dom = renderExpression(root);
    const boxes = allElements(dom, n => Boolean(n.dataset?.nodeId));
    const groups = [];
    walkExpression(root, node => { if (node.type === "Group") groups.push(node); });
    for (const group of groups) {
      const hitbox = boxes.find(box => box.dataset.nodeId === group.id);
      assert.ok(hitbox, `missing hitbox for ${group.id}`);
      const brackets = allElements(hitbox, n => n.className.includes("expression-bracket--explicit"));
      assert.ok(brackets.length >= 2);
      const text = hitbox.textContent;
      const expected = { round: ["(",")"], square: ["[","]"], curly: ["{","}"] }[group.bracketStyle];
      assert.ok(text.includes(expected[0]) && text.includes(expected[1]));
    }
    const parentIds = allElements(dom, n => Boolean(n.dataset?.parentId)).map(n => n.dataset.parentId);
    assert.ok(parentIds.includes(root.operands[1].operand.id));
    assert.ok(parentIds.includes(root.operands[1].operand.operands[1].operand.id));
  } finally {
    globalThis.document = originalDocument;
  }
});
