/* ========================================================================== *
 * Range grouping and persistent multi-selection regression tests
 * ========================================================================== *
 * These tests focus on the model invariants that would be easy to break when
 * adding factorisation, matrices or incremental expression editing later.
 * A browser-level pointer test is still needed to validate actual overlay
 * placement, focus handling and click-through behaviour.
 * ========================================================================== */
import test from "node:test";
import assert from "node:assert/strict";
import { parseExpression, expressionToInput } from "../../helpers/legacyRootParser.js";
import { findNodeLocation } from "../../../js/engine/treeUtils.js";
import { normaliseWithRules } from "../../../js/engine/normalization.js";
import { createSelectionModel } from "../../../js/view/selection.js";
import { createGroupingPreview, measureSelectedRows } from "../../../js/rules/grouping/overlay.js";
import { getRangeGroupingPlan, groupOperandRange } from "../../../js/engine/operations/grouping.js";
import { setAdditionAssociative } from "../../../js/engine/operations/addition.js";
import { setMultiplicationAssociative } from "../../../js/engine/operations/multiplication.js";

const ids = (root) => root.operands.map((node) => node.id);

test("selection is general-purpose: nonadjacent siblings can be selected without grouping", () => {
  const root = parseExpression("a+b+c+d");
  const selected = createSelectionModel();
  selected.toggle(root, root.operands[0].id);
  selected.toggle(root, root.operands[2].id);
  assert.deepEqual(selected.ids(), [root.operands[0].id, root.operands[2].id]);
  assert.equal(getRangeGroupingPlan(root, selected.ids()), null);
  assert.equal(expressionToInput(root), "a+b+c+d");
});

test("Ctrl+click order does not affect grouping order; proper range keeps all operand IDs", () => {
  const root = parseExpression("a+b+c+d");
  const [a,b,c,d] = root.operands;
  const originalRootId = root.id;
  const selected = createSelectionModel();
  selected.toggle(root, c.id);
  selected.toggle(root, b.id);
  const plan = getRangeGroupingPlan(root, selected.ids());
  assert.deepEqual(plan.operandIds, [b.id, c.id]);
  assert.equal(plan.start, 1);
  const result = groupOperandRange(root, selected.ids(), "square");
  assert.ok(result);
  assert.equal(root.id, originalRootId);
  assert.equal(root.operands[0], a);
  assert.equal(root.operands[2], d);
  assert.equal(root.operands[1].type, "Group");
  assert.equal(root.operands[1].bracketStyle, "square");
  assert.equal(root.operands[1].operand.operands[0], b);
  assert.equal(root.operands[1].operand.operands[1], c);
  assert.deepEqual(result.provenance.preservedOperandIds, [b.id, c.id]);
  // Provenance must name the two actual generated occurrences in creation order.
  // A length-only check would accept fabricated IDs and corrupt history metadata.
  assert.deepEqual(
    result.provenance.createdNodeIds,
    [result.inner.id, result.group.id],
    "provenance must identify the actual generated nodes in order"
  );
  assert.equal(expressionToInput(normaliseWithRules(root)), "a+[b+c]+d");
});

test("mixed parents, nested non-siblings and invalid styles cannot group or mutate", () => {
  const root = parseExpression("a*(b+c)+d");
  const product = root.operands[0];
  const a = product.operands[0];
  const sum = product.operands[1].operand;
  const b = sum.operands[0];
  const c = sum.operands[1];
  const before = JSON.stringify(root);
  assert.equal(getRangeGroupingPlan(root, [a.id,b.id]), null);
  assert.equal(groupOperandRange(root, [a.id,b.id]), null);
  assert.equal(groupOperandRange(root, [b.id,c.id], "triangle"), null);
  assert.equal(getRangeGroupingPlan(root, [b.id,b.id]), null);
  assert.equal(JSON.stringify(root), before);
});

test("selection removes ancestor/descendant conflicts but keeps unrelated selections", () => {
  const root = parseExpression("a*(b+c)+d");
  const selected = createSelectionModel();
  const product = root.operands[0];
  const sum = product.operands[1].operand;
  selected.toggle(root, product.id);
  selected.toggle(root, root.operands[1].id);
  selected.toggle(root, sum.operands[0].id);
  assert.deepEqual(selected.ids(), [root.operands[1].id, sum.operands[0].id]);
  selected.toggle(root, product.id);
  assert.deepEqual(selected.ids(), [root.operands[1].id, product.id]);
  selected.prune(parseExpression("q+r"));
  assert.equal(selected.size(), 0);
});

test("non-associative addition and multiplication refuse range grouping", () => {
  const add = parseExpression("a+b+c");
  const product = parseExpression("a*b*c").operands[0];
  try {
    setAdditionAssociative(false);
    assert.equal(getRangeGroupingPlan(add, ids(add).slice(0,2)), null);
    setMultiplicationAssociative(false);
    assert.equal(getRangeGroupingPlan(product, product.operands.slice(0,2).map(n=>n.id)), null);
  } finally {
    setAdditionAssociative(true);
    setMultiplicationAssociative(true);
  }
});

test("whole-product grouping wraps existing product and preserves its ID", () => {
  const root = parseExpression("a*b*c+d");
  const product = root.operands[0];
  const factorIds = product.operands.map((node) => node.id);
  const result = groupOperandRange(root, factorIds, "curly");
  assert.ok(result);
  assert.equal(result.inner, product);
  assert.equal(root.operands[0].operand, product);
  assert.equal(root.operands[0].operand.id, product.id);
  assert.deepEqual(root.operands[0].operand.operands.map(n=>n.id), factorIds);
  assert.equal(result.provenance.createdNodeIds.length, 1);
  normaliseWithRules(root);
  assert.equal(root.operands[0].operand.id, product.id);
});

test("grouping the full structural root range preserves the root Add ID", () => {
  const root = parseExpression("a+b+c");
  const originalId = root.id;
  const operandIds = ids(root);
  const result = groupOperandRange(root, operandIds);
  assert.ok(result);
  assert.equal(root.id, originalId);
  assert.equal(root.operands.length, 1);
  assert.deepEqual(root.operands[0].operand.operands.map(n=>n.id), operandIds);
});

test("selected range can be grouped inside an existing explicit Group", () => {
  const root = parseExpression("x+[a+b+c]+y");
  const inner = root.operands[1].operand;
  const b = inner.operands[1];
  const c = inner.operands[2];
  assert.equal(findNodeLocation(root,b.id).parent.id, inner.id);
  const result = groupOperandRange(root, [b.id,c.id]);
  assert.ok(result);
  assert.equal(inner.operands[1].operand.operands[0], b);
  assert.equal(inner.operands[1].operand.operands[1], c);
});

// A deliberately small fake DOM exercises the geometry/preview lifecycle.
// It is not a replacement for real browser layout tests.
class Element {
  constructor(tag, rect=[0,0,0,0]) {
    this.tag = tag; this.children=[]; this.style={}; this.attributes={};
    this.dataset={}; this.listeners={}; this.rect=rect; this.className="";
    this.classList={add(){},remove(){}};
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children=[...children]; }
  setAttribute(k,v) { this.attributes[k]=v; }
  addEventListener(k,fn) { this.listeners[k]=fn; }
  getBoundingClientRect() {
    const [left,top,width,height]=this.rect;
    return {left,top,width,height,right:left+width,bottom:top+height};
  }
  remove() { this.removed=true; }
}
function fakeOverlayFixture() {
  const elements=[new Element('div',[30,20,35,35]),new Element('div',[90,20,35,35])];
  elements[0].dataset.nodeId='b'; elements[1].dataset.nodeId='c';
  const equation={querySelectorAll:()=>elements};
  const document={body:new Element('body'),createElement:(tag)=>new Element(tag)};
  return {elements,equation,document};
}

test("selection envelope measures existing hitboxes without modifying their geometry", () => {
  const f=fakeOverlayFixture();
  const before=f.elements.map(el=>el.rect.slice());
  assert.deepEqual(measureSelectedRows(f.equation,['b','c']).map(r=>[r.left,r.right]),[[30,125]]);
  let enters=0, confirms=0;
  const overlay=createGroupingPreview(f.document,f.equation,{
    onEnterPreview:()=>enters++,onConfirm:()=>confirms++
  });
  overlay.setSelection(['b','c']);
  assert.equal(overlay.layer.children.length,1);
  assert.equal(overlay.layer.children[0].children.length,4);
  overlay.layer.children[0].children[0].listeners.click({preventDefault(){},stopPropagation(){}});
  assert.equal(enters,1);
  overlay.enterPreview('square');
  assert.equal(overlay.mode,'preview');
  assert.equal(overlay.layer.children[0].children[0].textContent,'[');
  overlay.layer.children[0].listeners.click({preventDefault(){},stopPropagation(){}});
  assert.equal(confirms,1);
  assert.deepEqual(f.elements.map(el=>el.rect),before);
  overlay.clear();
  assert.equal(overlay.layer.children.length,0);
});

test("wrapped visual rows use separate envelopes rather than one giant rectangle", () => {
  const f=fakeOverlayFixture();
  f.elements[1].rect=[10,90,35,35];
  const overlay=createGroupingPreview(f.document,f.equation,{onEnterPreview(){},onConfirm(){}});
  overlay.setSelection(['b','c']);
  assert.equal(overlay.layer.children.length,2);
  overlay.enterPreview();
  assert.equal(overlay.layer.children.length,2);
  assert.equal(overlay.layer.children[0].children.length,1); // opening bracket
  assert.equal(overlay.layer.children[1].children.length,1); // closing bracket
});
