/* ========================================================================== *
 * Recursive expression tree -> DOM renderer
 * ========================================================================== *
 * Every Add/Multiply child gets a hitbox linked to its ACTUAL node ID.
 * The same render functions run at EVERY level of nesting:
 *
 *   Add(root)
 *     Number(2)
 *     Group( Multiply(3, Group(Add(...)), Group(Add(...))) )
 * Other valid roots include Number, Symbol, Group, Negate, Multiply, Equal.
 *
 * A Group is one draggable object in its PARENT. Its opening and closing
 * brackets are INSIDE that parent's hitbox, so a drag carries them along.
 * Its CHILD is still rendered recursively, exposing independent smaller
 * Add/Multiply hitboxes for interaction inside the brackets.
 *
 * Why use div elements rather than nested <button> elements? HTML disallows
 * buttons inside buttons. With arbitrary nesting, every hitbox instead uses a
 * focusable div with role="button" and keyboard handling in app.js.
 *
 * The renderer DOES NOT edit nodes or perform any mathematical operations.
 * ========================================================================== */
import { isRelationNode } from "../../engine/nodeRegistry.js";
import { needsAutomaticBrackets, needsVisibleMultiplicationSign } from "../../engine/operatorMetadata.js";
import { specFor, describeNode } from "./nodeSpecs.js";
import { makeInert } from "./inert.js";
import { isTermSequence, sequenceOf, signDrawnInside } from "../../definitions/operators/presentation.js";
import { appendChunked } from "./rowChunks.js";
import { relationForNode } from "../../definitions/relations/relations.js";

/**
 * Settings (display choices only):
 *   substitutions, displayStyleOverride  notation
 *   inert    no part is focusable (rule 6): for previews and copies
 *   context  { parent, index } when drawing a SUBTREE on its own (rule 5,
 *            partial rendering): keeps notation correct, e.g. the automatic
 *            brackets a sum needs because it sits inside a product.
 */
export function renderExpression(root, options = {}) {
  if (options.inert) return makeInert(renderExpression(root, { ...options, inert: false }));

  if (isRelationNode(root)) {
    // Reuse the SAME expression renderer on each side. Relation identity
    // and the interaction rules enforce the drag boundary across '='.
    const equation = document.createElement("div");
    equation.className = "relation-root";
    equation.dataset.relationId = root.id;
    equation.dataset.parentId = root.id;
    equation.dataset.hitboxRole = "content";
    equation.append(renderExpression(root.left, { ...options, relationParentId: root.id }));
    const sign = document.createElement("span");
    sign.className = "relation-sign";
    sign.dataset.hitboxRole = "operator";
    sign.dataset.operatorOwnerId = root.id;
    // The relation's own sign and spoken name (=, <, >), from its definition.
    const relation = relationForNode(root);
    sign.textContent = relation?.notation?.print?.sign("display").trim() ?? "=";
    sign.setAttribute("aria-label", relation?.spoken ?? "equals");
    equation.append(sign, renderExpression(root.right, { ...options, relationParentId: root.id }));
    return equation;
  }
  if (!root) throw new TypeError("Cannot render an empty mathematical expression.");
  const container = document.createElement("div");
  container.className = "expression-root";
  const context = options.context;
  const contextBrackets = Boolean(context?.parent) && needsAutomaticBrackets(context.parent, root, context.index);
  const rootSequence = sequenceOf(root);
  if (rootSequence && options.relationParentId) {
    // R1 for an equation side (12 November 2026): a sum or product that is a
    // whole side of an equation gets its own invisible box, like a nested one,
    // so its operators and gaps belong to it. The row of terms inside keeps
    // the root layout (css/math-layout.css, .equation-side).
    const box = document.createElement("span");
    box.className = "term nested-operation equation-side";
    box.dataset.nodeId = root.id;
    box.dataset.parentId = options.relationParentId;
    box.dataset.hitboxRole = "occurrence";
    box.setAttribute("tabindex", "-1");
    box.setAttribute("aria-label", `Equation side: ${describe(root)}`);
    const row = document.createElement("div");
    row.className = `drag-container ${rootSequence.containerClass}`;
    row.dataset.parentId = root.id;
    row.dataset.hitboxRole = "content";
    row.setAttribute("aria-label", rootSequence.containerLabel);
    renderOperandSequence(root, row, options, contextBrackets);
    box.append(row);
    container.append(box);
  } else if (rootSequence) {
    // A complete expression may be either operation, including under Equal.
    // Its own operands still expose the same drag containers as nested nodes.
    container.classList.add("drag-container", rootSequence.containerClass);
    container.dataset.parentId = root.id;
    // Root operations have a semantic content container even when no
    // independent occurrence hitbox is created. Navigation may highlight it.
    container.dataset.hitboxRole = "content";
    container.setAttribute("aria-label", rootSequence.containerLabel);
    renderOperandSequence(root, container, options, contextBrackets);
  } else {
    // Group can become the entire side of an equality when all immediate
    // addends/factors are grouped. Render its brackets AND nested operation;
    // do not silently unwrap it or assume every side has an Add root.
    const hitbox = document.createElement("div");
    hitbox.className = "term add-operand term--compound root-expression-hitbox";
    hitbox.dataset.nodeId = root.id;
    hitbox.dataset.hitboxRole = "occurrence";
    if (options.relationParentId) hitbox.dataset.parentId = options.relationParentId;
    hitbox.setAttribute("role", "button");
    hitbox.setAttribute("tabindex", "0");
    // What the part IS; what it does is added after rendering (actionWording.js).
    hitbox.setAttribute("aria-label", `Expression: ${describe(root)}`);
    if (contextBrackets) {
      hitbox.append(makeBracket("(", "automatic"), makeNodeContents(root, options), makeBracket(")", "automatic"));
    } else {
      hitbox.append(makeNodeContents(root, options));
    }
    container.append(hitbox);
  }
  return container;
}

/**
 * Draw siblings and their operators. Works for nested OR root operations.
 * The items go in as row chunks (rowChunks.js, D14), so a long row breaks
 * only before an operator; read them back with rowItems().
 */
function renderOperandSequence(parent, container, options, brackets = false) {
  // Drag feedback (insertion gaps, combine and distribution targets) is
  // painted on the rendered DOM by dragFeedback.js, never by the renderer.
  const children = parent.operands;
  const items = [];
  if (brackets) items.push(makeBracket("(", "automatic"));
  children.forEach((child, index) => {
    // A ÷ factor draws its own sign (nodeSpecs Invert): no × before it.
    if (index > 0 && !signDrawnInside(child, parent)) {
      const signed = Boolean(sequenceOf(parent)?.signStyles) &&
        needsVisibleMultiplicationSign({ operands: children }, index);
      const operator = makeOperator(parent, options, signed, child);
      operator.dataset.operatorIndex = String(index);
      operator.dataset.operatorParentId = parent.id;
      items.push(operator);
      const hitbox = makeHitbox(child, parent, options, index);
      if (operator.dataset.beforeNegative) linkLeadingSign(operator, hitbox);
      items.push(hitbox);
      return;
    }
    items.push(makeHitbox(child, parent, options, index));
  });
  if (brackets) items.push(makeBracket(")", "automatic"));
  appendChunked(container, items);
}

/**
 * a − b (owner, 14 November 2026): the sum's + before a negative term is drawn
 * as a boxed − in the operator position, and the term's own leading sign is
 * hidden (css/math-layout.css, Subtraction "a − b"). Here the two are linked:
 * the term's first sign is marked data-leading-sign, and when that sign is a
 * Negate's minus, the + is marked data-stands-for-minus and becomes a button,
 * so a click or Enter on the boxed − does what the minus does (the negation
 * rule finds the hidden minus beside it and asks the resolver; no node id is
 * written here). Hover and drops still treat it as the sum's operator. The
 * tree is unchanged: a + (−b).
 */
function linkLeadingSign(operator, hitbox) {
  let element = hitbox;
  while (element) {
    const classes = element.classList;
    if (classes?.contains("expression-bracket")) return;
    if (classes?.contains("term__sign") || classes?.contains("negate-operator-hitbox")) break;
    element = element.children?.[0];
  }
  if (!element) return;
  element.dataset.leadingSign = "true";
  if (element.classList.contains("negate-operator-hitbox")) {
    operator.dataset.standsForMinus = "true";
    operator.removeAttribute("aria-hidden");
    operator.setAttribute("role", "button");
    operator.setAttribute("tabindex", "0");
    operator.setAttribute("aria-label", "minus sign");
  }
}

/** One moveable node (including any visible brackets) has ONE outer hitbox. */
function makeHitbox(node, parent, options, index) {
  const element = document.createElement("div");
  const sequence = sequenceOf(parent);
  element.className = `term ${sequence.termClass}`;
  // A term that draws its own sign (a ÷ factor) says so, for the drag preview.
  if (signDrawnInside(node, parent)) element.dataset.signInside = "true";
  if (specFor(node).compound) {
    element.classList.add("term--compound");
    if (sequence.compoundTermClass) element.classList.add(sequence.compoundTermClass);
  }
  element.dataset.nodeId = node.id;
  element.dataset.hitboxRole = "occurrence";
  element.dataset.parentId = parent.id;
  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  element.setAttribute("aria-label", `${sequence.termLabel}: ${describe(node)}`);

  // Precedence-driven parentheses have NO Group node. They are only a visual
  // safeguard, but must still sit INSIDE the moving factor's outer hitbox.
  if (needsAutomaticBrackets(parent, node, index)) {
    element.append(makeBracket("(", "automatic"));
    element.append(makeNodeContents(node, options));
    element.append(makeBracket(")", "automatic"));
  } else {
    element.append(makeNodeContents(node, options));
  }
  return element;
}

/**
 * Give a Group's directly enclosed leaf or Group its OWN occurrence target.
 * Previously Group(Number(-3)) displayed the Number only as text inside the
 * Group hitbox. This made the mathematical distinction between dropping onto
 * -3 and onto (-3) impossible to express through hit-testing.
 *
 * Add/Multiply children already receive operand hitboxes from their sequence
 * renderer. We intentionally retain that established geometry in v1 rather
 * than wrapping whole nested operation containers (which would change drag
 * coordinates and distribution/factorisation hit-testing). Those remaining
 * operation-level targets are a documented later migration.
 *
 * The nested target is NOT an Add/Multiply sibling: it must not masquerade as
 * a draggable factor or addend. Its parent ID identifies the enclosing Group.
 */
function makeNestedGroupOperand(operand, groupId, options) {
  if (isTermSequence(operand)) {
    // Renderer decision R1 (owner, 11 November 2026): a nested sum or product
    // gets its OWN occurrence box, so its operators and gaps belong to it and
    // not to the enclosing bracket (defect D8). It is invisible at rest
    // (css/hitboxes.css, .nested-operation): no padding, border or background,
    // so the layout does not move. It is not a tab stop; the structure
    // navigator reaches it. Not `.nested-occurrence`: dragging the terms
    // inside it must keep working exactly as before.
    const box = document.createElement("span");
    box.className = "term nested-operation";
    box.dataset.nodeId = operand.id;
    box.dataset.parentId = groupId;
    box.dataset.hitboxRole = "occurrence";
    box.setAttribute("tabindex", "-1");
    box.setAttribute("aria-label", `Nested ${describe(operand)}`);
    box.append(makeNodeContents(operand, options));
    return box;
  }
  const element = document.createElement("span");
  element.className = "term nested-occurrence";
  element.dataset.nodeId = operand.id;
  element.dataset.parentId = groupId;
  element.dataset.hitboxRole = "occurrence";
  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  element.setAttribute("aria-label", `Nested expression: ${describe(operand)}`);
  element.append(makeNodeContents(operand, options));
  return element;
}

/**
 * Render a node's INTERIOR, not another hitbox around the same node. How each
 * node type is written lives in ./nodeSpecs.js (renderer standard, step 6).
 */
function makeNodeContents(node, options) {
  return specFor(node).contents(node, kitFor(options));
}

// The shared machinery a node specification may use (see nodeSpecs.js).
function kitFor(options) {
  return {
    options,
    sequence: (node, container) => renderOperandSequence(node, container, options),
    nested: (child, ownerId) => makeNestedGroupOperand(child, ownerId, options),
    bracket: makeBracket,
    automaticBrackets: needsAutomaticBrackets
  };
}

function makeBracket(character, purpose) {
  const bracket = document.createElement("span");
  bracket.className = `expression-bracket expression-bracket--${purpose}`;
  bracket.textContent = character;
  bracket.setAttribute("aria-hidden", "true");
  return bracket;
}

function makeOperator(parent, options, signedFactorFollows = false, next = null) {
  return specFor(parent).operator(parent, kitFor(options), { signedFactorFollows, next });
}

const describe = describeNode;
