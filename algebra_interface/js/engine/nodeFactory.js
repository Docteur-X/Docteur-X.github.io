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
import { childrenOf } from "./nodeRegistry.js";
import { toExactString } from "./rational.js";

let nextNodeId = 1;
let patternMode = false;
let nextPatternId = 1;

/** Generate a unique ID for each newly-created node in this browser session. */
export function createNodeId() {
  return patternMode ? `pattern-${nextPatternId++}` : `node-${nextNodeId++}`;
}

/**
 * Build a PATTERN tree (an identity rule's sides, stage E4b) without using up
 * document node IDs: inside `build`, new nodes get `pattern-n` IDs. Pattern
 * nodes never enter a document (rebuilding gives every new node a fresh
 * document ID), so the IDs students' documents receive are unchanged by how
 * many identities are defined.
 */
export function buildPattern(build) {
  const wasPattern = patternMode;
  patternMode = true;
  try { return build(); } finally { patternMode = wasPattern; }
}

/**
 * Create a numeric literal node.
 *
 * The value is stored as an EXACT string such as "0.1" or "1234567890123"
 * (see rational.js), never as a rounded JavaScript number. Accepts a string,
 * an exact value or a finite number. Read values with rational.js, which also
 * accepts the plain numbers found in documents saved before this change.
 */
export function createNumber(value) {
  let exact;
  try { exact = toExactString(value); }
  catch (error) {
    if (error.name === "NumberTooLargeError") throw error;
    throw new TypeError(`A Number node needs a finite value; received ${value}.`);
  }
  return { id: createNodeId(), type: "Number", value: exact };
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
/**
 * Invert(x) is the multiplicative inverse of x: a÷b is Multiply(a, Invert(b)),
 * just as a−b is Add(a, Negate(b)). It appears only as a factor of a product,
 * never first (a real Number(1) leads instead: 1÷b; see
 * js/engine/divisionInvariant.js and the division design draft).
 */
export function createInvert(operand) {
  if (!isExpressionNode(operand)) throw new TypeError("Invert requires exactly one expression operand.");
  return { id: createNodeId(), type: "Invert", operand };
}

export function createNegate(operand) {
  if (!isExpressionNode(operand)) throw new TypeError("Negate requires exactly one expression operand.");
  return {
    id: createNodeId(),
    type: "Negate",
    operand
  };
}

/**
 * A function applied to arguments: Apply { operator: 'sin', arguments: [x] }.
 *
 * The text parser does not read function calls yet (stage E2), but the tree,
 * canonical text and MathJSON already handle them. Which functions exist, and
 * what they mean, will come from operator definitions (stage E3).
 */
export function createApply(operator, args = []) {
  const cleanName = String(operator).trim();
  if (!cleanName) throw new TypeError("An Apply node needs an operator name.");
  if (!args.every(isExpressionNode)) throw new TypeError("Apply accepts expressions only.");
  return { id: createNodeId(), type: "Apply", operator: cleanName, arguments: [...args] };
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

/**
 * A copy of a subtree in which every node has a fresh ID: a NEW occurrence of
 * the same expression (both sides of an equation each get their own copy).
 */
export function copyWithFreshIds(node) {
  const renumber = current => {
    current.id = createNodeId();
    childrenOf(current).forEach(renumber);
    return current;
  };
  return renumber(cloneExpression(node));
}

/** Raise the ID counter above IDs restored from disk/history.
 * A newly parsed node must never reuse an occurrence ID in a saved branch.
 */
export function reserveNodeIds(root) {
  if (!root || typeof root !== 'object') return;
  const match = /^node-(\d+)$/.exec(root.id || '');
  if (match) nextNodeId = Math.max(nextNodeId, Number(match[1]) + 1);
  // Every child slot the node registry knows (operands, arguments, operand, left/right).
  childrenOf(root).forEach(reserveNodeIds);
}
