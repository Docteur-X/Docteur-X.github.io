/* ========================================================================== *
 * Structural equality for mathematical expressions
 * ========================================================================== *
 * Node IDs identify OCCURRENCES, not mathematical values. Two separate 'a'
 * factors have different IDs, but they are the same factor for factorisation.
 * Likewise multiplication displayStyle and the chosen bracket glyph are
 * presentation metadata and should not change factor matching.
 *
 * This is intentionally NOT a symbolic simplifier: a+b and b+a do not match
 * just because addition is commutative. Students must explicitly rearrange
 * expressions before using the first version of factorisation.
 * ========================================================================== */

/** Remove any number of explicit Group wrappers for comparison ONLY. */
function ungroup(node) {
  while (node?.type === "Group") node = node.operand;
  return node;
}

export function structurallyEqual(left, right) {
  left = ungroup(left);
  right = ungroup(right);
  if (!left || !right || left.type !== right.type) return false;

  switch (left.type) {
    case "Number": return Object.is(left.value, right.value);
    case "Symbol": return left.name === right.name;
    case "Negate": return structurallyEqual(left.operand, right.operand);
    case "Add":
    case "Multiply":
      return left.operands.length === right.operands.length &&
        left.operands.every((child, index) => structurallyEqual(child, right.operands[index]));
    case "FunctionCall":
      return left.name === right.name &&
        left.arguments.length === right.arguments.length &&
        left.arguments.every((child, index) => structurallyEqual(child, right.arguments[index]));
    default:
      // Unknown future node types must opt into equality deliberately.
      return false;
  }
}
