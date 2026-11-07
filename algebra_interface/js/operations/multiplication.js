/* ========================================================================== *
 * Multiplication rules — DOM-independent.
 * ========================================================================== *
 * Current rules:
 *   0 * a = 0,  a * 0 = 0    even when a is symbolic
 *   1 * a = a,  a * 1 = a
 *   numeric * numeric = numeric
 *
 * For 0 * a * b, explicitly combining zero with another factor reduces the
 * WHOLE product to zero. This is not automatic parsing/simplification: users
 * can still deliberately enter an unsimplified product containing zero.
 *
 * Like addition, the caller removes the moving child before committing.
 * ========================================================================== */
import { createNumber } from "../core/nodeFactory.js";
import { evaluateNumericNode, reorderChild, replaceChild, walkExpression } from "../core/treeUtils.js";

export const MULTIPLICATION_DISPLAY_STYLES = Object.freeze({
  IMPLICIT: "implicit", DOT: "dot", TIMES: "times"
});

// Independent algebraic properties. Moving factors is permitted only when
// commutative; flattening nested products requires associativity, not it.
let associative = true;
let commutative = true;
export function setMultiplicationAssociative(value) { associative = Boolean(value); }
export function isMultiplicationAssociative() { return associative; }
export function setMultiplicationCommutative(value) { commutative = Boolean(value); }
export function canFlattenMultiplication(parent, child) {
  return associative && parent?.type === "Multiply" && child?.type === "Multiply";
}
export function canReorderFactor(multiplyNode, factorId, destinationIndex) {
  return commutative && multiplyNode?.type === "Multiply" &&
    Number.isInteger(destinationIndex) && destinationIndex >= 0 &&
    destinationIndex < multiplyNode.operands.length &&
    multiplyNode.operands.some((child) => child.id === factorId);
}
export function reorderFactor(multiplyNode, factorId, destinationIndex) {
  return canReorderFactor(multiplyNode, factorId, destinationIndex) &&
    reorderChild(multiplyNode, factorId, destinationIndex);
}

function isLiteral(node, value) {
  // Explicit Group shells around numeric literals remain transparent to
  // the zero/one identity rules, e.g. (1)*x = x and [0]*x = 0.
  if (node?.type === "Group") return isLiteral(node.operand, value);
  return node?.type === "Number" && node.value === value;
}

/** Preview an algebraic combination WITHOUT modifying either operand. */
export function getMultiplicationCombination(target, moving, substitutions = {}) {
  if (isLiteral(target, 0) || isLiteral(moving, 0)) return { kind: "zero", value: 0 };
  if (isLiteral(moving, 1)) return { kind: "keep-target" };
  if (isLiteral(target, 1)) return { kind: "keep-moving" };

  const a = evaluateNumericNode(target, substitutions);
  const b = evaluateNumericNode(moving, substitutions);
  if (a === null || b === null) return null;
  return { kind: "numeric", value: cleanFloatingPoint(a * b) };
}

export function canCombineFactors(target, moving, substitutions = {}) {
  return getMultiplicationCombination(target, moving, substitutions) !== null;
}

export function combineNumericFactors(multiplyNode, targetId, movingNode, substitutions = {}) {
  if (multiplyNode?.type !== "Multiply") return null;
  const targetNode = multiplyNode.operands.find((child) => child.id === targetId);
  if (!targetNode) return null;
  const rule = getMultiplicationCombination(targetNode, movingNode, substitutions);
  if (!rule) return null;

  const result = rule.kind === "keep-target" ? targetNode
    : rule.kind === "keep-moving" ? movingNode
      : createNumber(rule.value);
  if (rule.kind === "zero") {
    // Even if other factors remain, the ENTIRE product is zero.
    // normaliseExpressionTree will collapse the resulting one-factor product.
    multiplyNode.operands = [result];
  } else if (!replaceChild(multiplyNode, targetId, result)) {
    return null;
  }
  return { result, targetNode, value: rule.value ?? null, kind: rule.kind };
}

/** Purely visual override for every Multiply node, including nested ones. */
export function setAllMultiplicationDisplayStyles(root, displayStyle) {
  if (!Object.values(MULTIPLICATION_DISPLAY_STYLES).includes(displayStyle)) {
    throw new TypeError(`Unsupported multiplication display style: ${displayStyle}`);
  }
  let changedCount = 0;
  walkExpression(root, (node) => {
    if (node.type !== "Multiply" || node.displayStyle === displayStyle) return;
    node.displayStyle = displayStyle;
    changedCount += 1;
  });
  return changedCount;
}

function cleanFloatingPoint(value) {
  if (!Number.isFinite(value)) throw new Error("Numeric multiplication overflowed.");
  const rounded = Number(value.toPrecision(12));
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Scalar multiplicative identity, independent of commutativity. */
export function createMultiplicativeIdentity() { return createNumber(1); }
