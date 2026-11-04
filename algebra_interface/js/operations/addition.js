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
import { createNumber } from "../core/nodeFactory.js";
import { evaluateNumericNode, reorderChild, replaceChild } from "../core/treeUtils.js";

// These two settings describe mathematical permissions, not UI behaviour.
// If associativity is disabled, a nested Add must not silently flatten;
// if commutativity is disabled, rearranging addends is forbidden.
let associative = true;
let commutative = true;
export function setAdditionAssociative(value) { associative = Boolean(value); }
export function isAdditionAssociative() { return associative; }
export function setAdditionCommutative(value) { commutative = Boolean(value); }
export function canFlattenAddition(parent, child) {
  return associative && parent?.type === "Add" && child?.type === "Add";
}
export function canReorderAddend(addNode, addendId, destinationIndex) {
  return commutative && addNode?.type === "Add" &&
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
  return node?.type === "Number" && node.value === 0;
}

/**
 * Describe the possible rewrite without mutating the tree. Returning null
 * means no current rule applies. Evaluating the numeric case calls the shared
 * recursive evaluator and can see through explicit Group wrappers.
 */
export function getAdditionCombination(target, moving, substitutions = {}) {
  if (isLiteralZero(moving)) return { kind: "keep-target" };
  if (isLiteralZero(target)) return { kind: "keep-moving" };

  const a = evaluateNumericNode(target, substitutions);
  const b = evaluateNumericNode(moving, substitutions);
  if (a === null || b === null) return null;
  return { kind: "numeric", value: cleanFloatingPoint(a + b) };
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

function cleanFloatingPoint(value) {
  if (!Number.isFinite(value)) throw new Error("Numeric addition overflowed.");
  const rounded = Number(value.toPrecision(12));
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Scalar additive identity. Future type-aware structures can provide factories. */
export function createAdditiveIdentity() { return createNumber(0); }
