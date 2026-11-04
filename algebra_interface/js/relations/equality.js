/** Equality is a binary RELATION, never an arithmetic operand. */
import { createNodeId } from "../core/nodeFactory.js";
import { isScalarExpression } from "../core/nodeCategories.js";
import { evaluateNumericNode } from "../core/treeUtils.js";
import { structurallyEqual } from "../core/structuralEquality.js";

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
  const literal = node => node.type === "Number" ? node.value
    : node.type === "Add" && node.operands.length === 1 ? literal(node.operands[0])
    : node.type === "Group" ? literal(node.operand) : null;
  const left = literal(a), right = literal(b);
  if (left !== null && right !== null) {
    return { status: left === right ? "true" : "false", reason: "literal-comparison" };
  }
  // Reflexivity is sound only for expressions that denote defined values.
  // Current arithmetic nodes are total for finite assigned scalar inputs.
  if (structurallyEqual(a, b)) return { status: "true", reason: "reflexivity", conditionalOnDefinedness: true };
  if (Object.keys(assignments).length) {
    const av = evaluateNumericNode(a, assignments), bv = evaluateNumericNode(b, assignments);
    if (av !== null && bv !== null && Number.isFinite(av) && Number.isFinite(bv))
      return { status: av === bv ? "true" : "false", reason: "assignment-check" };
  }
  return { status: "unknown", reason: "not-directly-comparable" };
}
