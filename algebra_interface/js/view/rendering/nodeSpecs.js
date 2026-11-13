/**
 * Node specifications (renderer standard, step 6): how each node type is
 * WRITTEN, in one place. Adding a node type (fractions, powers, logical
 * connectives) means adding one entry here plus its section in
 * css/math-layout.css, not edits across the renderer.
 *
 * Each entry may define:
 *   describe(node)            what the part is, for labels ("sum", "x")
 *   compound                  true when its box holds other boxes
 *   contents(node, kit)       its interior (NOT its box; the renderer makes
 *                             boxes and labels)
 *   operator(node, kit, info) one operator between two children, for
 *                             operations drawn as a sequence
 *
 * `kit` is the renderer's shared machinery, so a specification never builds
 * boxes or labels itself:
 *   kit.sequence(node)            the labelled children with their operators
 *   kit.nested(child, ownerId)    a child's own box inside this node
 *   kit.bracket(char, purpose)    a bracket ("explicit" or "automatic")
 *   kit.automaticBrackets(parent, child, position)
 *   kit.options                   display choices (substitutions, sign style)
 *
 * No rule, state or interaction here: a specification describes notation.
 */
import { GROUP_BRACKETS } from "../../engine/nodeFactory.js";
import { formatExact } from "../../engine/rational.js";

function sequenceContents(node, kit, className, label) {
  const sequence = document.createElement("span");
  sequence.className = `${className} drag-container`;
  sequence.dataset.hitboxRole = "content";
  sequence.dataset.parentId = node.id;
  sequence.setAttribute("role", "group");
  sequence.setAttribute("aria-label", label);
  kit.sequence(node, sequence);
  return sequence;
}

// Literal leaves (and future function calls) show a small text label, plus
// a Symbol's assigned value as a badge (a display choice, decision R3).
function leafContents(node, kit) {
  const wrapper = document.createElement("span");
  wrapper.className = "term__content";
  const text = document.createElement("span");
  // A letter is marked as a letter, so the font set can draw it italic.
  text.className = node.type === "Symbol" ? "term__label term__label--symbol" : "term__label";
  // A negative number is printed with a true minus sign (D13); its spoken and
  // copied form, describeNode, keeps the plain text. The sign is its own
  // element, so a − b can draw it in the sum's operator position instead.
  const written = describeNode(node);
  if (written.startsWith("-")) {
    const sign = document.createElement("span");
    sign.className = "term__sign";
    sign.textContent = "−";
    wrapper.append(sign);
  }
  text.textContent = written.replace(/^-/, "");
  wrapper.append(text);
  const substitutions = kit.options.substitutions || {};
  if (node.type === "Symbol" && Object.hasOwn(substitutions, node.name)) {
    const badge = document.createElement("small");
    badge.className = "term__substitution";
    badge.textContent = `=${formatExact(substitutions[node.name])}`;
    wrapper.append(badge);
  }
  return wrapper;
}

/**
 * A term written with a leading minus: a Negate, a negative number, or a
 * product whose first factor is one (−3y). The minus is inside that term.
 */
function isNegativeTerm(node) {
  if (!node) return false;
  if (node.type === "Negate") return true;
  if (node.type === "Multiply") return isNegativeTerm(node.operands[0]);
  return node.type === "Number" && describeNode(node).startsWith("-");
}

function operatorElement(node) {
  const element = document.createElement("span");
  element.setAttribute("aria-hidden", "true");
  element.dataset.hitboxRole = "operator";
  element.dataset.operatorOwnerId = node.id;
  return element;
}

export const NODE_SPECS = Object.freeze({
  Add: Object.freeze({
    describe: () => "sum",
    compound: true,
    contents: (node, kit) => sequenceContents(node, kit, "add-content", "Addends"),
    operator(node, kit, { next = null } = {}) {
      const element = operatorElement(node);
      element.className = "plus";
      element.dataset.sumId = node.id;
      element.textContent = "+";
      // Before a negative term the sum can be written a − b (the display
      // setting "Subtraction", css/math-layout.css); the + stays in the page
      // and in the tree, and the minus stays inside its own term.
      if (isNegativeTerm(next)) element.dataset.beforeNegative = "true";
      return element;
    }
  }),
  Multiply: Object.freeze({
    describe: () => "product",
    compound: true,
    contents: (node, kit) => sequenceContents(node, kit, "multiply-content", "Factors"),
    operator(node, kit, { signedFactorFollows = false } = {}) {
      const element = operatorElement(node);
      const override = kit.options.displayStyleOverride;
      const chosenStyle = override && override !== "source" ? override : node.displayStyle;
      // Notation only: an implicit product still shows a sign before a signed factor.
      const style = chosenStyle === "implicit" && signedFactorFollows ? "dot" : chosenStyle;
      element.className = `multiply-operator multiply-operator--${style}`;
      element.textContent = style === "times" ? "×" : style === "dot" ? "·" : "";
      return element;
    }
  }),
  Group: Object.freeze({
    describe: () => "bracketed expression",
    compound: true,
    contents(node, kit) {
      const group = document.createElement("span");
      group.className = "group-content";
      group.dataset.hitboxRole = "content";
      group.append(kit.bracket(GROUP_BRACKETS[node.bracketStyle][0], "explicit"));
      // The child gets its own box inside the brackets; the Group stays one
      // draggable object in its parent.
      group.append(kit.nested(node.operand, node.id));
      group.append(kit.bracket(GROUP_BRACKETS[node.bracketStyle][1], "explicit"));
      return group;
    }
  }),
  Negate: Object.freeze({
    describe: () => "negative expression",
    contents(node, kit) {
      const label = document.createElement("span");
      label.className = "negate-content";
      // The minus sign is the Negate's operator: an activation target, not
      // an occurrence of its own.
      const minus = document.createElement("span");
      minus.textContent = "−";
      minus.className = "negate-operator-hitbox";
      minus.dataset.hitboxRole = "operator";
      minus.dataset.operatorKind = "negate";
      minus.dataset.operatorOwnerId = node.id;
      minus.setAttribute("role", "button");
      minus.setAttribute("tabindex", "0");
      minus.setAttribute("aria-label", "minus sign");
      label.append(minus);
      if (kit.automaticBrackets(node, node.operand, "operand")) {
        label.append(kit.bracket("(", "automatic"), kit.nested(node.operand, node.id), kit.bracket(")", "automatic"));
      } else {
        label.append(kit.nested(node.operand, node.id));
      }
      return label;
    }
  }),
  // Division: a÷b is Multiply(a, Invert(b)). The ÷ belongs to the Invert, as
  // the − belongs to a Negate, so it is drawn INSIDE the Invert's own box and
  // [÷b] moves as one factor; the product draws no × before it.
  Invert: Object.freeze({
    describe: () => "division",
    contents(node, kit) {
      const label = document.createElement("span");
      label.className = "invert-content";
      const sign = document.createElement("span");
      sign.textContent = "÷";
      sign.className = "invert-sign";
      sign.dataset.hitboxRole = "operator";
      sign.dataset.operatorKind = "invert";
      sign.dataset.operatorOwnerId = node.id;
      sign.setAttribute("aria-label", "divided by");
      label.append(sign);
      if (kit.automaticBrackets(node, node.operand, "operand")) {
        label.append(kit.bracket("(", "automatic"), kit.nested(node.operand, node.id), kit.bracket(")", "automatic"));
      } else {
        label.append(kit.nested(node.operand, node.id));
      }
      return label;
    }
  }),
  Number: Object.freeze({ describe: node => formatExact(node.value), contents: leafContents }),
  Symbol: Object.freeze({ describe: node => node.name, contents: leafContents }),
  Apply: Object.freeze({
    // A function call (stage E4): its name, then its arguments in its own
    // brackets. The name is the Apply's operator, an activation target (like
    // the minus of a Negate); each argument gets its own box, as a Group's
    // child does, so it can be selected and worked on inside the function.
    describe: node => `${node.operator} of ${node.arguments.length === 1 ? describeNode(node.arguments[0]) : '…'}`,
    compound: true,
    contents(node, kit) {
      const content = document.createElement("span");
      content.className = "apply-content";
      content.dataset.hitboxRole = "content";
      const name = document.createElement("span");
      name.className = "apply-name";
      name.textContent = node.operator;
      name.dataset.hitboxRole = "operator";
      name.dataset.operatorKind = "function";
      name.dataset.operatorOwnerId = node.id;
      name.setAttribute("role", "button");
      name.setAttribute("tabindex", "0");
      name.setAttribute("aria-label", `function ${node.operator}`);
      content.append(name, kit.bracket("(", "explicit"));
      node.arguments.forEach((argument, index) => {
        if (index > 0) content.append(", ");
        content.append(kit.nested(argument, node.id));
      });
      content.append(kit.bracket(")", "explicit"));
      return content;
    }
  })
});

// Any type without an entry is written as a plain leaf labelled "expression".
const FALLBACK = Object.freeze({ describe: () => "expression", contents: leafContents });

export const specFor = node => NODE_SPECS[node?.type] ?? FALLBACK;
export const describeNode = node => specFor(node).describe(node);

/**
 * The names a node's text uses, for writing it with its letters marked
 * (notationText.js): Symbols are letters (the font set's letter face), Apply
 * names are function names (upright). Kept here, the one place that names
 * node types on the drawing side.
 */
export function namesForText(node, symbols = new Set(), functions = new Set()) {
  if (!node || typeof node !== "object") return { symbols, functions };
  if (node.type === "Symbol") symbols.add(node.name);
  if (node.type === "Apply") functions.add(node.operator);
  for (const key of ["operands", "arguments"]) for (const child of node[key] ?? []) namesForText(child, symbols, functions);
  if (node.operand) namesForText(node.operand, symbols, functions);
  return { symbols, functions };
}
