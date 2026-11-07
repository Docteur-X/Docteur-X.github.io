/* ========================================================================== *
 * Distribution, algebraic law boundaries, origin IDs and rendering previews.
 * ========================================================================== *
 * Every mathematical test here runs in Node without a browser. The app's
 * pointer-to-plus detection is a UI concern; this suite verifies the shared
 * mathematical eligibility/commit contract it calls. The mock DOM test
 * verifies that the temporary amber COPIES are clickable buttons (and no
 * separate circle/arrow controls exist). No fake mathematical nodes appear.
 * ========================================================================== */
import test from "node:test";
import assert from "node:assert/strict";
import { parseExpression, expressionToInput } from "../js/core/parser.js";
import { toMathJSON } from "../js/core/mathJson.js";
import { cloneExpression, createAdd, createSymbol } from "../js/core/nodeFactory.js";
import { evaluateNumericNode, findNodeById, walkExpression } from "../js/core/treeUtils.js";
import { normaliseWithRules } from "../js/core/normalization.js";
import { getDistributionPlan, applyDistribution, unwrapGroupedSum } from "../js/operations/distribution.js";
import { setAdditionAssociative, isAdditionAssociative } from "../js/operations/addition.js";
import {
  setMultiplicationCommutative, setMultiplicationAssociative,
  isMultiplicationAssociative, reorderFactor
} from "../js/operations/multiplication.js";
import { renderExpression } from "../js/rendering/domRenderer.js";

function getProduct(text) {
  const root = parseExpression(text);
  assert.equal(root.operands[0].type, "Multiply", text);
  return { root, product: root.operands[0] };
}
function proposal(product, sourceIndex, targetIndex) {
  const sum = unwrapGroupedSum(product.operands[targetIndex]);
  assert.ok(sum, "target should be sum within zero or more Groups");
  return getDistributionPlan(product, product.operands[sourceIndex].id, sum.id);
}
function allIds(root) {
  const ids = [];
  walkExpression(root, (node) => ids.push(node.id));
  return ids;
}

test("left distribution of a(b+c+d) preserves original b/c/d IDs", () => {
  const { root, product } = getProduct("a*(b+c+d)");
  const source = product.operands[0];
  const sum = unwrapGroupedSum(product.operands[1]);
  const originalIds = sum.operands.map((n) => n.id);
  const before = cloneExpression(root);
  const plan = proposal(product, 0, 1);
  assert.equal(plan.direction, "left");
  assert.deepEqual(root, before, "looking up the rule must not mutate state");
  const result = applyDistribution(root, plan);
  assert.ok(result);
  assert.deepEqual(toMathJSON(root), ["Add", ["Multiply", "a", "b"], ["Multiply", "a", "c"], ["Multiply", "a", "d"]]);
  const after = root.operands[0];
  assert.deepEqual(after.operands.map((n) => n.operands[1].id), originalIds);
  const newIds = result.provenance.copiesBySourceId[source.id];
  assert.equal(newIds.length, 3);
  assert.equal(new Set(newIds).size, 3);
  assert.ok(newIds.every((id) => id !== source.id));
  assert.equal(new Set(allIds(root)).size, allIds(root).length, "node IDs remain unique");
});

test("right distribution of (a+b)c never reverses factor order", () => {
  const { root, product } = getProduct("(a+b)*c");
  const plan = proposal(product, 1, 0);
  assert.equal(plan.direction, "right");
  assert.ok(applyDistribution(root, plan));
  assert.deepEqual(toMathJSON(root), ["Add", ["Multiply", "a", "c"], ["Multiply", "b", "c"]]);
});

test("left and right distribution work when commutativity is disabled", () => {
  setMultiplicationCommutative(false);
  try {
    for (const [source, src, target, expected] of [
      ["a*(b+c)", 0, 1, ["Add", ["Multiply", "a", "b"], ["Multiply", "a", "c"]]],
      ["(a+b)*c", 1, 0, ["Add", ["Multiply", "a", "c"], ["Multiply", "b", "c"]]]
    ]) {
      const { root, product } = getProduct(source);
      assert.equal(reorderFactor(product, product.operands[0].id, 1), false);
      const plan = proposal(product, src, target);
      assert.ok(applyDistribution(root, plan));
      assert.deepEqual(toMathJSON(root), expected);
    }
  } finally { setMultiplicationCommutative(true); }
});

test("distribution in a longer product keeps unrelated factors in order", () => {
  const { root, product } = getProduct("x*a*(b+c)*y");
  const xId = product.operands[0].id;
  const yId = product.operands[3].id;
  const oldProductId = product.id;
  const plan = proposal(product, 1, 2);
  assert.ok(applyDistribution(root, plan));
  assert.equal(root.operands[0].id, oldProductId);
  assert.equal(product.operands[0].id, xId);
  assert.equal(product.operands[2].id, yId);
  assert.deepEqual(toMathJSON(root), ["Multiply", "x", ["Add", ["Multiply", "a", "b"], ["Multiply", "a", "c"]], "y"]);
  // Parentheses are mandatory even though Group boundaries were consumed.
  assert.match(expressionToInput(root), /\(.*\+.*\)/);
});

test("distribution from the right inside an outer product preserves neighbour order", () => {
  const { root, product } = getProduct("x*(b+c)*a*y");
  const plan = proposal(product, 2, 1);
  assert.ok(applyDistribution(root, plan));
  assert.deepEqual(toMathJSON(root), ["Multiply", "x", ["Add", ["Multiply", "b", "a"], ["Multiply", "c", "a"]], "y"]);
});

test("nonadjacent factors cannot distribute across an intervening factor", () => {
  const { root, product } = getProduct("a*x*(b+c)");
  const original = cloneExpression(root);
  assert.equal(proposal(product, 0, 2), null);
  assert.equal(applyDistribution(root, { productId: product.id, sourceFactorId: product.operands[0].id, sumId: unwrapGroupedSum(product.operands[2]).id, direction: "left" }), null);
  assert.deepEqual(root, original);
});

test("a plus sign in a deeply nested unrelated sum cannot trigger distribution", () => {
  const { root, product } = getProduct("a*(b+(c+d))");
  const targetOuter = unwrapGroupedSum(product.operands[1]);
  assert.ok(getDistributionPlan(product, product.operands[0].id, targetOuter.id));
  const inner = targetOuter.operands[1].operand;
  assert.equal(inner.type, "Add");
  assert.equal(getDistributionPlan(product, product.operands[0].id, inner.id), null);
  assert.equal(applyDistribution(root, { productId: product.id, sourceFactorId: product.operands[0].id, sumId: inner.id, direction: "left" }), null);
});

test("multiple nested explicit Group wrappers are transparent to applicability", () => {
  const { root, product } = getProduct("a*((b+c))");
  assert.ok(getDistributionPlan(product, product.operands[0].id, unwrapGroupedSum(product.operands[1]).id));
  assert.ok(applyDistribution(root, proposal(product, 0, 1)));
  assert.deepEqual(toMathJSON(root), ["Add", ["Multiply", "a", "b"], ["Multiply", "a", "c"]]);
});

test("compound source factors receive distinct new nested IDs with provenance", () => {
  const { root, product } = getProduct("(x+y)*(a+b)");
  const source = product.operands[0];
  const beforeIds = allIds(source);
  const result = applyDistribution(root, proposal(product, 0, 1));
  assert.ok(result);
  for (const id of beforeIds) {
    const copies = result.provenance.copiesBySourceId[id];
    assert.equal(copies.length, 2, `each nested node ${id} should have two copies`);
    assert.ok(copies.every((copyId) => copyId !== id));
    assert.equal(new Set(copies).size, 2);
  }
  assert.equal(new Set(allIds(root)).size, allIds(root).length);
});

test("distribution works on nested products and preserves enclosing Groups", () => {
  const root = parseExpression("2+[3*(a+b)*4]");
  const outer = root.operands[1];
  const outerId = outer.id;
  const product = outer.operand;
  const plan = proposal(product, 0, 1);
  assert.ok(applyDistribution(root, plan));
  assert.equal(outer.id, outerId);
  assert.equal(outer.bracketStyle, "square");
  assert.equal(outer.operand.type, "Multiply");
  assert.deepEqual(toMathJSON(root), ["Add", 2, ["Multiply", ["Add", ["Multiply", 3, "a"], ["Multiply", 3, "b"]], 4]]);
});

test("numerical evaluation is unchanged by distribution", () => {
  const { root, product } = getProduct("2*(3+4+5)");
  const before = evaluateNumericNode(root);
  const original = cloneExpression(root);
  const plan = proposal(product, 0, 1);
  assert.deepEqual(root, original, "preview planning should be pure");
  assert.ok(applyDistribution(root, plan));
  assert.equal(evaluateNumericNode(root), before);
  assert.equal(before, 24);
});

test("stale or direction-forged plans are rejected without mutation", () => {
  const { root, product } = getProduct("a*(b+c)");
  const good = proposal(product, 0, 1);
  const before = cloneExpression(root);
  assert.equal(applyDistribution(root, { ...good, direction: "right" }), null);
  assert.equal(applyDistribution(root, { ...good, sourceFactorId: "not-a-factor" }), null);
  assert.equal(applyDistribution(root, null), null);
  assert.deepEqual(root, before);
});

test("associativity permissions are owned by operation modules, not factories", () => {
  setAdditionAssociative(false);
  setMultiplicationAssociative(false);
  try {
    const sum = parseExpression("a+b+c");
    const product = parseExpression("a*b*c");
    assert.equal(isAdditionAssociative(), false);
    assert.equal(isMultiplicationAssociative(), false);
    assert.equal(sum.operands[0].type, "Add");
    assert.equal(product.operands[0].operands[0].type, "Multiply");
    assert.match(expressionToInput(sum), /\(a\+b\)\+c/);
    assert.match(expressionToInput(product), /\(a·b\)·c/);
    const before = cloneExpression(sum);
    normaliseWithRules(sum);
    assert.deepEqual(sum, before);
  } finally {
    setAdditionAssociative(true);
    setMultiplicationAssociative(true);
  }
});

/* Renderer-only test: the temporary copies are not real nodes. The amber
 * factor itself is the accessible button; overhead SVG arrows are visual. */
class ElementStub {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.dataset = {};
    this.className = "";
    this.attributes = {};
    this.classList = { add: (...classes) => this.className += " " + classes.join(" ") };
  }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(key, value) { this.attributes[key] = value; }
  set textContent(value) { this.text = value; }
  get textContent() { return this.text ?? this.children.map((item) => item.textContent).join(""); }
}
function descendants(node, predicate, result = []) {
  if (predicate(node)) result.push(node);
  node.children.forEach((child) => descendants(child, predicate, result));
  return result;
}
test("rendered preview has three clickable amber copies, no circle arrows, and original addends", () => {
  const previousDocument = globalThis.document;
  try {
    globalThis.document = { createElement: (tag) => new ElementStub(tag) };
    const { root, product } = getProduct("a*(b+c+d)");
    const plan = proposal(product, 0, 1);
    const original = cloneExpression(root);
    const dom = renderExpression(root, {
      distributionPreview: { ...plan, sourceText: "a" }
    });
    const confirmControls = descendants(dom, (element) => element.dataset?.distributionConfirm === "true");
    const copied = descendants(dom, (element) => element.className.includes("distribution-preview__copy"));
    const originals = descendants(dom, (element) => element.className.includes("distribution-preview__original"));
    assert.equal(confirmControls.length, 3);
    assert.deepEqual(confirmControls, copied, "the amber copies themselves are the confirmation controls");
    assert.ok(copied.every((button) => button.tag === "button" && button.attributes["aria-label"]));
    assert.equal(descendants(dom, (element) => element.className.includes("distribution-preview__arrow")).length, 0,
      "no standalone arrow buttons should push terms down or clutter the preview");
    assert.deepEqual(copied.map((item) => item.textContent), ["a", "a", "a"]);
    assert.deepEqual(originals.map((item) => item.textContent), ["b", "c", "d"]);
    assert.deepEqual(root, original, "renderer must not touch the expression tree");
  } finally { globalThis.document = previousDocument; }
});

test("rendered plus signs disclose their exact Add parent for hit-testing", () => {
  const previousDocument = globalThis.document;
  try {
    globalThis.document = { createElement: (tag) => new ElementStub(tag) };
    const { root, product } = getProduct("a*(b+c)");
    const plan = proposal(product, 0, 1);
    const dom = renderExpression(root, { distributionHover: plan });
    const highlighted = descendants(dom, (node) => node.className.includes("plus--distribution-drop"));
    assert.equal(highlighted.length, 1);
    assert.equal(highlighted[0].dataset.sumId, plan.sumId);
  } finally { globalThis.document = previousDocument; }
});

// Regression: the preview can target a product inside either side of Equal.
// Confirmation must validate that subtree, not require an Add document root.
for (const [input, side] of [
  ["a*(b+c)=d", "left"],
  ["d=a*(b+c)", "right"]
]) {
  test(`distribution confirms inside equality ${side} side`, () => {
    const root = parseExpression(input);
    const product = root[side].type === "Multiply"
      ? root[side] : root[side].operands.find(n => n.type === "Multiply");
    assert.ok(product, "expected product inside equality");
    const plan = proposal(product, 0, 1);
    const untouchedSide = side === "left" ? "right" : "left";
    const originalOther = cloneExpression(root[untouchedSide]);
    const result = applyDistribution(root, plan);
    assert.ok(result, "confirmation should succeed within an Equal root");
    assert.deepEqual(root[untouchedSide], originalOther, "other equation side is unchanged");
    assert.ok(result.provenance.copiesBySourceId[plan.sourceFactorId].length === 2);
    assert.equal(root.type, "Equal");
  });
}
