/** Equality is a binary RELATION, never an arithmetic operand. */
import { createNodeId } from "../nodeFactory.js";
import { isScalarExpression } from "../nodeCategories.js";
import { evaluateNumericNode } from "../treeUtils.js";
import { equals, isExactNumberInput, NumberTooLargeError } from "../rational.js";
import { REJECTION_REASONS } from "../ruleRejections.js";
import { structurallyEqual } from "../structuralEquality.js";

export function createEqual(left, right) {
  if (!isScalarExpression(left) || !isScalarExpression(right)) {
    throw new TypeError("Equality v1 requires two scalar expressions.");
  }
  return { id: createNodeId(), type: "Equal", left, right };
}
/** Swap the same child objects, preserving occurrence IDs and factor order. */
export function swapEqualitySides(equal) {
  if (equal?.type !== "Equal") throw new TypeError("Expected an Equal statement.");
  [equal.left, equal.right] = [equal.right, equal.left];
  return { rule: "equality.symmetry", relationId: equal.id,
    leftId: equal.left.id, rightId: equal.right.id };
}
/** Four-valued CHECK result, not a truth value permanently stored on a node.
 * Unknown is not false; undefined is not the same as missing assignments.
 * v1 only compares literal numeric sides and structural reflexivity; it does
 * not silently evaluate arithmetic to reveal a student's answer.
 */
export function evaluateEquality(equal, assignments = {}) {
  if (equal?.type !== "Equal") throw new TypeError("Expected an Equal statement.");
  const a = equal.left, b = equal.right;
  const literal = node => node.type === "Number" && isExactNumberInput(node.value) ? node.value
    : node.type === "Add" && node.operands.length === 1 ? literal(node.operands[0])
    : node.type === "Group" ? literal(node.operand) : null;
  const left = literal(a), right = literal(b);
  if (left !== null && right !== null) {
    // Exact comparison, so 0.1+0.2 and 0.3 compare as equal (defect D4).
    return { status: equals(left, right) ? "true" : "false", reason: "literal-comparison" };
  }
  // Reflexivity is sound only for expressions that denote defined values.
  // Current arithmetic nodes are total for finite assigned scalar inputs.
  if (structurallyEqual(a, b)) return { status: "true", reason: "reflexivity", conditionalOnDefinedness: true };
  if (Object.keys(assignments).length) {
    try {
      const av = evaluateNumericNode(a, assignments), bv = evaluateNumericNode(b, assignments);
      if (av !== null && bv !== null)
        return { status: equals(av, bv) ? "true" : "false", reason: "assignment-check" };
    } catch (error) {
      // Too large to compare exactly: say so rather than guess.
      if (!(error instanceof NumberTooLargeError)) throw error;
      // Same reason code as the arithmetic rules, so one hint message serves both.
      return { status: "unknown", reason: REJECTION_REASONS.NUMBER_TOO_LARGE };
    }
  }
  return { status: "unknown", reason: "not-directly-comparable" };
}
