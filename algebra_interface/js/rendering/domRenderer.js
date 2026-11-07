/* ========================================================================== *
 * Recursive expression tree -> DOM renderer
 * ========================================================================== *
 * Every Add/Multiply child gets a hitbox linked to its ACTUAL node ID.
 * The same render functions run at EVERY level of nesting:
 *
 *   Add(root)
 *     Number(2)
 *     Group( Add( Multiply(3, Group(Add(...)), Group(Add(...))) ) )
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
import { GROUP_BRACKETS } from "../core/nodeFactory.js";
import { needsAutomaticBrackets } from "../core/operatorMetadata.js";
import { expressionToDisplayString } from "../core/parser.js";
import { unwrapGroupedSum } from "../operations/distribution.js";

export function renderExpression(root, options = {}) {
  if (root?.type === "Equal") {
    // Reuse the SAME expression renderer on each side. Separate Add roots
    // form a strict drag boundary; no operation can cross '=' accidentally.
    const equation = document.createElement("div");
    equation.className = "equality-root";
    equation.dataset.relationId = root.id;
    equation.append(renderExpression(root.left, { ...options, relationParentId: root.id }));
    const sign = document.createElement("span");
    sign.className = "equality-sign";
    sign.dataset.hitboxRole = "operator";
    sign.dataset.operatorOwnerId = root.id;
    sign.textContent = "=";
    sign.setAttribute("aria-label", "equals");
    equation.append(sign, renderExpression(root.right, { ...options, relationParentId: root.id }));
    return equation;
  }
  if (!root) throw new TypeError("Cannot render an empty mathematical expression.");
  const container = document.createElement("div");
  container.className = "expression-root";
  if (root.type === "Add" || root.type === "Multiply") {
    // A complete expression may be either operation, including under Equal.
    // Its own operands still expose the same drag containers as nested nodes.
    container.classList.add("drag-container", root.type === "Add" ? "add-expression" : "multiply-expression");
    container.dataset.parentId = root.id;
    container.setAttribute("aria-label", root.type === "Add" ? "Expression addends" : "Expression factors");
    renderOperandSequence(root, container, options);
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
    hitbox.setAttribute("aria-label", `Expression: ${describe(root)}. Click selects.`);
    if (options.selectedNodeId === root.id) hitbox.classList.add("is-selected");
    applyVisualRoles(hitbox, root.id, options);
    hitbox.append(makeNodeContents(root, options));
    container.append(hitbox);
  }
  return container;
}

/** Draw siblings and their operators. Works for nested OR root operations. */
function renderOperandSequence(parent, container, options) {
  // A distribution preview is purely presentational: none of these temporary
  // factor copies are mathematical nodes, and no history state is created.
  // Showing them INSIDE the existing sum's brackets makes it apparent which
  // expression the proposed transformation will affect.
  if (parent.type === "Add" && options.distributionPreview?.sumId === parent.id) {
    renderDistributionPreviewSequence(parent, container, options);
    return;
  }
  const children = parent.operands.slice();
  const insert = options.drag?.parentId === parent.id && options.insertionIndex !== null;
  if (insert) {
    const index = Math.max(0, Math.min(options.insertionIndex, children.length));
    children.splice(index, 0, null);
  }
  children.forEach((child, index) => {
    if (index > 0) {
      const operator = makeOperator(parent, options);
      operator.dataset.operatorIndex = String(index);
      operator.dataset.operatorParentId = parent.id;
      container.append(operator);
    }
    container.append(child === null ? makeDropSlot(parent.type)
      : makeHitbox(child, parent, options, index));
  });
}

/**
 * Apply declarative presentation roles to the OUTERMOST occurrence hitbox.
 * This renderer owns visual semantics and geometry; the Engine only reports
 * identities. Descendant hitboxes are never marked by inherited CSS classes.
 * A future visualiser can supply additional roles through this boundary.
 */
function applyVisualRoles(element, nodeId, options) {
  if (options.visualRoles?.insertedOperandIds?.includes(nodeId)) {
    element.classList.add("equality-inserted-operand");
    element.dataset.equalityPreviewConfirm = "true";
    element.title = "Confirm insertion of this clipboard expression on both sides";
  }
}

/** One moveable node (including any visible brackets) has ONE outer hitbox. */
function makeHitbox(node, parent, options, index) {
  const element = document.createElement("div");
  const kind = parent.type === "Add" ? "add-operand" : "factor-slot";
  element.className = `term ${kind}`;
  if (node.type === "Multiply" || node.type === "Add" || node.type === "Group") {
    element.classList.add("term--compound");
    if (kind === "add-operand") element.classList.add("add-operand--product");
  }
  element.dataset.nodeId = node.id;
  element.dataset.hitboxRole = "occurrence";
  element.dataset.parentId = parent.id;
  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  element.setAttribute("aria-label", `${parent.type === "Add" ? "Addend" : "Factor"}: ${describe(node)}. Arrows reorder; click selects.`);

  // Precedence-driven parentheses have NO Group node. They are only a visual
  // safeguard, but must still sit INSIDE the moving factor's outer hitbox.
  if (needsAutomaticBrackets(parent, node, index)) {
    element.append(makeBracket("(", "automatic"));
    element.append(makeNodeContents(node, options));
    element.append(makeBracket(")", "automatic"));
  } else {
    element.append(makeNodeContents(node, options));
  }
  if (options.selectedNodeId === node.id) element.classList.add("is-selected");
  applyVisualRoles(element, node.id, options);
  // A source factor is not multiplied yet; yellow shows a *proposed rule*.
  if (options.distributionPreview?.sourceFactorId === node.id) {
    element.classList.add("is-distribution-source");
  }
  const groupedSum = parent.type === "Multiply" ? unwrapGroupedSum(node) : null;
  if (groupedSum && options.distributionHover?.sumId === groupedSum.id) {
    element.classList.add("is-distribution-target");
  }
  if (groupedSum && options.distributionPreview?.sumId === groupedSum.id) {
    element.classList.add("is-distribution-target");
  }
  const combineTarget = options.combineTargetId === node.id &&
    options.combineParentType === parent.type;
  if (combineTarget) {
    element.classList.add("is-combine-target");
    element.dataset.combineLabel = parent.type === "Add" ? "Release to add" : "Release to multiply";
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
  if (operand.type === "Add" || operand.type === "Multiply") {
    return makeNodeContents(operand, options);
  }
  const element = document.createElement("span");
  element.className = "term nested-occurrence";
  element.dataset.nodeId = operand.id;
  element.dataset.parentId = groupId;
  element.dataset.hitboxRole = "occurrence";
  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  element.setAttribute("aria-label", `Nested expression: ${describe(operand)}. Click selects.`);
  if (options.selectedNodeId === operand.id) element.classList.add("is-selected");
  applyVisualRoles(element, operand.id, options);
  element.append(makeNodeContents(operand, options));
  return element;
}

/** Render a node's INTERIOR, not another hitbox around the same node. */
function makeNodeContents(node, options) {
  if (node.type === "Add" || node.type === "Multiply") {
    const sequence = document.createElement("span");
    sequence.className = `${node.type === "Add" ? "add-content" : "multiply-content"} drag-container`;
    sequence.dataset.hitboxRole = "content";
    sequence.dataset.parentId = node.id;
    sequence.setAttribute("role", "group");
    sequence.setAttribute("aria-label", node.type === "Add" ? "Addends" : "Factors");
    renderOperandSequence(node, sequence, options);
    return sequence;
  }
  if (node.type === "Group") {
    const group = document.createElement("span");
    group.className = "group-content";
    group.dataset.hitboxRole = "content";
    group.append(makeBracket(GROUP_BRACKETS[node.bracketStyle][0], "explicit"));
    // Render nested sums/products as independent drag containers. A simple
    // grouped symbol displays directly; the outer Group remains draggable.
    group.append(makeNestedGroupOperand(node.operand, node.id, options));
    group.append(makeBracket(GROUP_BRACKETS[node.bracketStyle][1], "explicit"));
    return group;
  }
  if (node.type === "Negate") {
    const label = document.createElement("span");
    label.className = "negate-content";
    const minus = document.createElement("span");
    minus.textContent = "−";
    minus.className = "negate-operator-hitbox";
    minus.dataset.hitboxRole = "operator";
    minus.dataset.operatorKind = "negate";
    minus.dataset.operatorOwnerId = node.id;
    minus.setAttribute("role", "button");
    minus.setAttribute("tabindex", "0");
    minus.setAttribute("aria-label", "Expand negation as multiplication by negative one");
    minus.title = "Click to expose −1";
    label.append(minus);
    if (needsAutomaticBrackets(node, node.operand, "operand")) {
      label.append(makeBracket("(", "automatic"));
      label.append(makeNestedGroupOperand(node.operand, node.id, options));
      label.append(makeBracket(")", "automatic"));
    } else {
      label.append(makeNestedGroupOperand(node.operand, node.id, options));
    }
    return label;
  }
  // Literal leaf nodes and future function calls show a small label.
  const wrapper = document.createElement("span");
  wrapper.className = "term__content";
  const text = document.createElement("span");
  text.className = "term__label";
  text.textContent = describe(node);
  wrapper.append(text);
  if (node.type === "Symbol" && Object.hasOwn(options.substitutions || {}, node.name)) {
    const badge = document.createElement("small");
    badge.className = "term__substitution";
    badge.textContent = `=${formatNumber(Number(options.substitutions[node.name]))}`;
    wrapper.append(badge);
  }
  return wrapper;
}

function makeBracket(character, purpose) {
  const bracket = document.createElement("span");
  bracket.className = `expression-bracket expression-bracket--${purpose}`;
  bracket.textContent = character;
  bracket.setAttribute("aria-hidden", "true");
  return bracket;
}

function makeOperator(parent, options) {
  const element = document.createElement("span");
  element.setAttribute("aria-hidden", "true");
  element.dataset.hitboxRole = "operator";
  element.dataset.operatorOwnerId = parent.id;
  if (parent.type === "Add") {
    element.className = "plus";
    element.dataset.sumId = parent.id;
    if (options.distributionHover?.sumId === parent.id) {
      element.classList.add("plus--distribution-drop");
    }
    element.textContent = "+";
    return element;
  }
  const style = options.displayStyleOverride && options.displayStyleOverride !== "source"
    ? options.displayStyleOverride : parent.displayStyle;
  element.className = `multiply-operator multiply-operator--${style}`;
  element.textContent = style === "times" ? "×" : style === "dot" ? "·" : "";
  return element;
}

/**
 * Build the YELLOW, *uncommitted* expansion inside an Add node.
 *
 * Example after dragging a to the + in (b+c+d):
 *   a( a·b + a·c + a·d )
 * where the first a outside remains genuine, but the inner a's are ephemeral
 * button elements. The original b,c,d are shown in their normal text colour.
 *
 * Each AMBER COPY is itself a real button with a comfortably sized click
 * area. Clicking one confirms the whole distribution, not just that copy.
 * We deliberately do NOT render separate circular arrow buttons: those would
 * take up vertical space and push the mathematics below its normal baseline.
 * The overhead SVG arrows remain decorative and take up no layout space.
 * The preview copies are not expression-tree nodes and never get node IDs.
 */
function renderDistributionPreviewSequence(sum, container, options) {
  container.classList.add("distribution-preview", "distribution-preview--" + options.distributionPreview.direction);
  container.setAttribute("aria-label", "Proposed distribution. Click any amber factor copy to expand; Escape or click elsewhere to cancel.");
  sum.operands.forEach((addend, index) => {
    if (index > 0) container.append(makeOperator(sum, options));
    const item = document.createElement("span");
    item.className = "distribution-preview__item";

    const product = document.createElement("span");
    product.className = "distribution-preview__product";

    // The temporary factor is the ONLY confirmation control. Its amber box
    // is visually part of the proposed product and is large enough to click
    // or tap. Using a native button also provides Tab / Enter / Space support
    // without creating any fake mathematical hitboxes or node IDs.
    const copiedFactor = document.createElement("button");
    copiedFactor.type = "button";
    copiedFactor.className = "distribution-preview__copy";
    copiedFactor.dataset.distributionConfirm = "true";
    copiedFactor.title = "Apply the full distributive expansion";
    copiedFactor.setAttribute("aria-label", `Apply ${options.distributionPreview.direction} distribution (copy ${index + 1} of ${sum.operands.length})`);
    // display string is textContent, not HTML, so symbols cannot inject markup.
    copiedFactor.textContent = options.distributionPreview.sourceText;
    const original = document.createElement("span");
    original.className = "distribution-preview__original";
    original.textContent = expressionToDisplayString(addend);
    const multiply = document.createElement("span");
    multiply.className = "distribution-preview__multiplication";
    multiply.textContent = "·";
    if (options.distributionPreview.direction === "left") {
      product.append(copiedFactor, multiply, original);
    } else {
      product.append(original, multiply, copiedFactor);
    }
    item.append(product);
    container.append(item);
  });
}

function makeDropSlot(parentType) {
  const slot = document.createElement("span");
  slot.className = `drop-slot drop-slot--${parentType === "Add" ? "addend" : "factor"}`;
  slot.setAttribute("aria-label", "Insert moved term here");
  return slot;
}

function describe(node) {
  switch (node.type) {
    case "Number": return formatNumber(node.value);
    case "Symbol": return node.name;
    case "Group": return "bracketed expression";
    case "Multiply": return "product";
    case "Add": return "sum";
    case "Negate": return "negative expression";
    case "FunctionCall": return `${node.name}(…)`;
    default: return "expression";
  }
}
function formatNumber(value) {
  const rounded = Number(Number(value).toPrecision(12));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}
