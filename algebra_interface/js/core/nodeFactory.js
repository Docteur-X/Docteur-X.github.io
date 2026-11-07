/* ========================================================================== *
 * Expression node factory
 * ========================================================================== *
 * The expression tree is made entirely of plain JavaScript objects.  These
 * constructors are the only place that new mathematical nodes should be
 * created.  Keeping node creation central makes it much easier to validate,
 * serialise, clone, and later extend the expression language.
 *
 * Node IDs are application metadata, not mathematical content.  They let the
 * editor recognise the same visual object after it has moved elsewhere in
 * the tree.  MathJSON conversion deliberately omits these IDs.
 * ========================================================================== */

import { isExpressionNode } from "./nodeCategories.js";

let nextNodeId = 1;

/** Generate a unique ID for each newly-created node in this browser session. */
export function createNodeId() {
  return `node-${nextNodeId++}`;
}

/**
 * Create a numeric literal node.
 *
 * Numeric values are stored as JavaScript numbers, not strings.  Formatting
 * is handled by the parser/renderer, so arithmetic never needs to re-parse a
 * number from its displayed text.
 */
export function createNumber(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new TypeError(`A Number node needs a finite value; received ${value}.`);
  }

  return {
    id: createNodeId(),
    type: "Number",
    value: Object.is(numericValue, -0) ? 0 : numericValue
  };
}

/** Create a symbolic variable/constant node. */
export function createSymbol(name) {
  const cleanName = String(name).trim();
  if (!cleanName) throw new TypeError("A Symbol node needs a non-empty name.");

  return {
    id: createNodeId(),
    type: "Symbol",
    name: cleanName
  };
}

/**
 * Create an Add node.
 *
 * This factory does not flatten nested nodes. Association is handled by a
 * rule-aware normalizer, never by an implicit assumption in the constructor.
 */
export function createAdd(operands) {
  // The factory ONLY constructs a node: it does not assert associativity.
  // Rule-aware normalisation (operations/addition.js) decides whether nested
  // Add children may later be flattened. Group boundaries are always kept.
  const children = operands.filter(Boolean);
  if (children.length === 0) throw new TypeError("An Add node must contain at least one operand.");
  if (!children.every(isExpressionNode)) throw new TypeError("Add accepts expressions only.");
  return { id: createNodeId(), type: "Add", operands: children };
}

/**
 * Create a Multiply node.
 *
 * `displayStyle` is presentation metadata.  It records how the product should
 * be shown, not what the product means:
 *   - "implicit": juxtaposition, e.g. ab
 *   - "dot":       centred dot, e.g. a · b
 *   - "times":     multiplication sign, e.g. a × b
 *
 * Directly nested Multiply nodes are preserved until a rule-aware normalizer
 * confirms that associativity allows flattening. Explicit Groups stay intact.
 * A one-factor product is returned as that factor rather than creating an
 * unnecessary Multiply wrapper.
 */
export function createMultiply(operands, displayStyle = "implicit") {
  const validStyles = new Set(["implicit", "dot", "times"]);
  if (!validStyles.has(displayStyle)) {
    throw new TypeError(`Unknown multiplication display style: ${displayStyle}`);
  }

  const children = operands.filter(Boolean);
  if (children.length === 0) throw new TypeError("A Multiply node must contain at least one factor.");
  if (!children.every(isExpressionNode)) throw new TypeError("Multiply accepts expressions only.");
  if (children.length === 1) return children[0];
  // Preserve factor order and nesting; only the multiplication RULE can grant
  // permission to flatten directly nested products in a subsequent pass.
  return { id: createNodeId(), type: "Multiply", operands: children, displayStyle };
}

/**
 * Create an EXPLICIT pair of brackets around exactly one expression.
 *
 * Group is a user-authored boundary, not a new arithmetic operator.
 * Its child may be a Number, Symbol, Add, Multiply, or another Group.
 * We deliberately keep even (x) and ((x)): students may want to select,
 * move, or remove those boundaries individually.
 *
 * The `bracketStyle` is editor presentation metadata. It is saved in history
 * and editable input, but is not part of the mathematical MathJSON value.
 */
export const GROUP_BRACKETS = Object.freeze({
  round: ["(", ")"],
  square: ["[", "]"],
  curly: ["{", "}"]
});

export function createGroup(operand, bracketStyle = "round") {
  if (!isExpressionNode(operand)) {
    throw new TypeError("Group requires one expression node as its child.");
  }
  if (!Object.hasOwn(GROUP_BRACKETS, bracketStyle)) {
    throw new TypeError(`Unsupported bracket style: ${bracketStyle}`);
  }
  return { id: createNodeId(), type: "Group", operand, bracketStyle };
}

/**
 * Represent unary negation explicitly.
 *
 * Negative numeric literals are stored directly as Number(-3).  Negate is
 * useful for symbolic forms such as -a and is kept separate so that future
 * simplification rules can distinguish -a from an arbitrary product.
 */
export function createNegate(operand) {
  if (!isExpressionNode(operand)) throw new TypeError("Negate requires exactly one expression operand.");
  return {
    id: createNodeId(),
    type: "Negate",
    operand
  };
}

/**
 * Future-ready function-call node.
 *
 * The current text parser intentionally does not parse parenthesised function
 * calls yet, but the tree and MathJSON converter already have a place for
 * them.  For example, a future parser can create FunctionCall("sin", [x]).
 */
export function createFunctionCall(name, args = []) {
  const cleanName = String(name).trim();
  if (!cleanName) throw new TypeError("A FunctionCall node needs a name.");

  return {
    id: createNodeId(),
    type: "FunctionCall",
    name: cleanName,
    arguments: [...args]
  };
}

/**
 * Clone a mathematical expression tree.
 *
 * All current node properties are JSON-compatible data (strings, numbers,
 * arrays and plain objects), so JSON cloning is safe and keeps history
 * snapshots independent from the live tree.  If functions or class instances
 * are ever added to nodes, replace this with an explicit recursive clone.
 */
export function cloneExpression(node) {
  return JSON.parse(JSON.stringify(node));
}

/** Raise the ID counter above IDs restored from disk/history.
 * A newly parsed node must never reuse an occurrence ID in a saved branch.
 */
export function reserveNodeIds(root) {
  if (!root || typeof root !== 'object') return;
  const match = /^node-(\d+)$/.exec(root.id || '');
  if (match) nextNodeId = Math.max(nextNodeId, Number(match[1]) + 1);
  if (Array.isArray(root.operands)) root.operands.forEach(reserveNodeIds);
  // Future function-call ASTs also own child occurrences.
  if (Array.isArray(root.arguments)) root.arguments.forEach(reserveNodeIds);
  for (const key of ['left', 'right', 'operand', 'child']) if (root[key]) reserveNodeIds(root[key]);
}
