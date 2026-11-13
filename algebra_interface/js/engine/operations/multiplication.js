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
import { createNumber } from "../nodeFactory.js";
import { evaluateNumericNode, reorderChild, replaceChild, walkExpression } from "../treeUtils.js";
import { equals, isExactNumberInput, multiply, toExactString } from "../rational.js";
import { createRejection, REJECTION_REASONS } from "../ruleRejections.js";
import { hasProperty, setPropertyOverride } from "../structures.js";

export const MULTIPLICATION_DISPLAY_STYLES = Object.freeze({
  IMPLICIT: "implicit", DOT: "dot", TIMES: "times"
});

// Independent algebraic properties, from the type definition (js/definitions/types/
// scalar/) through js/engine/structures.js (Engine stage E3). Moving factors is
// permitted only when commutative; flattening nested products requires
// associativity, not it. The setters are a lesson override (tests use them).
export function setMultiplicationAssociative(value) { setPropertyOverride("Multiply", "associative", value); }
export function isMultiplicationAssociative() { return hasProperty("Multiply", "associative"); }
export function setMultiplicationCommutative(value) { setPropertyOverride("Multiply", "commutative", value); }
export function canFlattenMultiplication(parent, child) {
  return isMultiplicationAssociative() && parent?.type === "Multiply" && child?.type === "Multiply";
}
export function canReorderFactor(multiplyNode, factorId, destinationIndex) {
  return hasProperty("Multiply", "commutative") && multiplyNode?.type === "Multiply" &&
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
  return node?.type === "Number" && isExactNumberInput(node.value) && equals(node.value, value);
}

/** Preview an algebraic combination WITHOUT modifying either operand. */
export function getMultiplicationCombination(target, moving, substitutions = {}) {
  return analyseMultiplicationCombination(target, moving, substitutions).plan;
}

/**
 * Why two factors cannot be combined, when there is a reason worth telling the
 * student; otherwise null. Ready for a future hint system: nothing shows it yet.
 */
export function explainMultiplicationRejection(target, moving, substitutions = {}) {
  return analyseMultiplicationCombination(target, moving, substitutions).rejection;
}

/** One analysis for both: { plan, rejection }, at most one of them non-null. */
function analyseMultiplicationCombination(target, moving, substitutions) {
  if (isLiteral(target, 0) || isLiteral(moving, 0)) return { plan: { kind: "zero", value: "0" }, rejection: null };
  // ×1 can simply be dropped, except against a ÷ factor: 1 × ÷2 is the number
  // 1/2 (arithmetic below), and 1 × ÷b would leave a bare ÷ (the leading 1).
  if (isLiteral(moving, 1) && target?.type !== "Invert") return { plan: { kind: "keep-target" }, rejection: null };
  if (isLiteral(target, 1) && moving?.type !== "Invert") return { plan: { kind: "keep-moving" }, rejection: null };

  // Exact arithmetic: no rounding. A result too large to work with is refused,
  // with a reason, rather than answered approximately.
  try {
    const a = evaluateNumericNode(target, substitutions);
    const b = evaluateNumericNode(moving, substitutions);
    if (a === null || b === null) return { plan: null, rejection: null };
    return { plan: { kind: "numeric", value: toExactString(multiply(a, b)) }, rejection: null };
  } catch (error) {
    if (error.name !== "NumberTooLargeError") throw error;
    return { plan: null, rejection: createRejection(REJECTION_REASONS.NUMBER_TOO_LARGE) };
  }
}

export function canCombineFactors(target, moving, substitutions = {}) {
  return getMultiplicationCombination(target, moving, substitutions) !== null;
}

/**
 * 0 × (a product with a divisor) is 0 only if every divisor is nonzero:
 * 0·a÷b = 0 needs b ≠ 0. Returns the divisors the zero rule must ASSUME are
 * nonzero (symbolic ones), or null when a divisor is known to be 0 (then the
 * product has no value and the rule is refused). Division stage D3: the
 * assumptions are kept with the history step, like b÷b = 1.
 */
export function zeroProductAssumptions(multiplyNode, substitutions = {}) {
  if (multiplyNode?.type !== "Multiply") return [];
  const divisors = [];
  let knownZero = false;
  walkExpression(multiplyNode, node => {
    if (node.type !== "Invert") return;
    const divisor = evaluateNumericNode(node.operand, substitutions);
    if (divisor === null) divisors.push(node.operand);
    else if (equals(divisor, 0)) knownZero = true;
  });
  return knownZero ? null : divisors;
}

/** The pair check, plus the whole-product condition for the zero rule. */
export function canCombineFactorsIn(multiplyNode, target, moving, substitutions = {}) {
  const rule = getMultiplicationCombination(target, moving, substitutions);
  if (!rule) return false;
  return !(rule.kind === "zero" && zeroProductAssumptions(multiplyNode, substitutions) === null);
}

export function combineNumericFactors(multiplyNode, targetId, movingNode, substitutions = {}) {
  if (multiplyNode?.type !== "Multiply") return null;
  const targetNode = multiplyNode.operands.find((child) => child.id === targetId);
  if (!targetNode) return null;
  const rule = getMultiplicationCombination(targetNode, movingNode, substitutions);
  if (!rule) return null;
  // The zero rule needs every symbolic divisor to be nonzero (kept as assumptions).
  const assumptions = rule.kind === "zero" ? zeroProductAssumptions(multiplyNode, substitutions) : [];
  if (assumptions === null) return null;

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
  return { result, targetNode, value: rule.value ?? null, kind: rule.kind, divisorsAssumedNonzero: assumptions };
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

/** Scalar multiplicative identity, independent of commutativity. */
export function createMultiplicativeIdentity() { return createNumber(1); }
