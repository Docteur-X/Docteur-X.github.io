/* ========================================================================== *
 * Addition rules — entirely independent of browser/DOM code.
 * ========================================================================== *
 * The application first calls canCombineAddends() while the user drags, then
 * calls combineNumericAddends() only when a valid drop is committed.
 * IMPORTANT: Both functions share the same applicability test, so a green
 * hover preview cannot promise an operation the drop handler will reject.
 *
 * Rules currently supported:
 *   0 + a = a          (no need to know the value of a)
 *   a + 0 = a
 *   numeric + numeric = a Number node
 *   (numeric expression) + numeric = a Number node
 *
 * The caller has already removed the moving node from the Add operand list.
 * It must put it back if this function fails, and normalise after success.
 * Group nodes can be numerically evaluated without removing their brackets
 * first. A completed numeric COMBINATION consumes the operands and thus also
 * consumes any explicit Group wrappers belonging to those operands.
 * ========================================================================== */
import { createNumber } from "../nodeFactory.js";
import { evaluateNumericNode, reorderChild, replaceChild } from "../treeUtils.js";
import { add, isExactNumberInput, isZero, toExactString } from "../rational.js";
import { createRejection, REJECTION_REASONS } from "../ruleRejections.js";
import { hasProperty, setPropertyOverride } from "../structures.js";

// The properties of + come from the type definition (js/definitions/types/scalar/:
// associative and commutative), through js/engine/structures.js (Engine stage
// E3). If associativity is off, a nested Add must not silently flatten; if
// commutativity is off, rearranging addends is forbidden. The setters are a
// lesson override (tests use them; axiomatic mode will).
export function setAdditionAssociative(value) { setPropertyOverride("Add", "associative", value); }
export function isAdditionAssociative() { return hasProperty("Add", "associative"); }
export function setAdditionCommutative(value) { setPropertyOverride("Add", "commutative", value); }
export function canFlattenAddition(parent, child) {
  return isAdditionAssociative() && parent?.type === "Add" && child?.type === "Add";
}
export function canReorderAddend(addNode, addendId, destinationIndex) {
  return hasProperty("Add", "commutative") && addNode?.type === "Add" &&
    Number.isInteger(destinationIndex) && destinationIndex >= 0 &&
    destinationIndex < addNode.operands.length &&
    addNode.operands.some((child) => child.id === addendId);
}
export function reorderAddend(addNode, addendId, destinationIndex) {
  return canReorderAddend(addNode, addendId, destinationIndex) &&
    reorderChild(addNode, addendId, destinationIndex);
}

/** Distinguish an actual numeric literal zero from a substituted variable. */
function isLiteralZero(node) {
  // Parentheses around a literal do not change its algebraic identity.
  // Recurse through Group wrappers WITHOUT treating substituted variables as
  // literal zero (that would silently rewrite symbolic expressions).
  if (node?.type === "Group") return isLiteralZero(node.operand);
  return node?.type === "Number" && isExactNumberInput(node.value) && isZero(node.value);
}

/**
 * Describe the possible rewrite without mutating the tree. Returning null
 * means no current rule applies. Evaluating the numeric case calls the shared
 * recursive evaluator and can see through explicit Group wrappers.
 */
export function getAdditionCombination(target, moving, substitutions = {}) {
  return analyseAdditionCombination(target, moving, substitutions).plan;
}

/**
 * Why two addends cannot be combined, when there is a reason worth telling the
 * student; otherwise null. Ready for a future hint system: nothing shows it yet.
 */
export function explainAdditionRejection(target, moving, substitutions = {}) {
  return analyseAdditionCombination(target, moving, substitutions).rejection;
}

/** One analysis for both: { plan, rejection }, at most one of them non-null. */
function analyseAdditionCombination(target, moving, substitutions) {
  if (isLiteralZero(moving)) return { plan: { kind: "keep-target" }, rejection: null };
  if (isLiteralZero(target)) return { plan: { kind: "keep-moving" }, rejection: null };

  // Exact arithmetic: no rounding. A result too large to work with is refused,
  // with a reason, rather than answered approximately.
  try {
    const a = evaluateNumericNode(target, substitutions);
    const b = evaluateNumericNode(moving, substitutions);
    if (a === null || b === null) return { plan: null, rejection: null };
    return { plan: { kind: "numeric", value: toExactString(add(a, b)) }, rejection: null };
  } catch (error) {
    if (error.name !== "NumberTooLargeError") throw error;
    return { plan: null, rejection: createRejection(REJECTION_REASONS.NUMBER_TOO_LARGE) };
  }
}

export function canCombineAddends(target, moving, substitutions = {}) {
  return getAdditionCombination(target, moving, substitutions) !== null;
}

/** Replace the target with the appropriate result of a valid combination. */
export function combineNumericAddends(addNode, targetId, movingNode, substitutions = {}) {
  if (addNode?.type !== "Add") return null;
  const targetNode = addNode.operands.find((child) => child.id === targetId);
  if (!targetNode) return null;
  const rule = getAdditionCombination(targetNode, movingNode, substitutions);
  if (!rule) return null;

  // Reuse surviving symbolic nodes (with their existing stable IDs) rather
  // than needlessly rebuilding them. This helps the animation/history model.
  const result = rule.kind === "keep-target" ? targetNode
    : rule.kind === "keep-moving" ? movingNode
      : createNumber(rule.value);
  if (!replaceChild(addNode, targetId, result)) return null;
  return { result, targetNode, value: rule.value ?? null, kind: rule.kind };
}

/** Scalar additive identity. Future type-aware structures can provide factories. */
export function createAdditiveIdentity() { return createNumber(0); }
