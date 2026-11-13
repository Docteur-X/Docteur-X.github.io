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
 *
 * Generic over the node registry (nodeRegistry.js): two nodes are equal when
 * they have the same type, the same meaning fields and equal children in
 * order. Notation fields are ignored. Numbers compare by exact value.
 * ========================================================================== */
import { equals, isExactNumberInput } from "./rational.js";
import { childEntries, meaningFieldsOf, nodeTypeInfo } from "./nodeRegistry.js";

/** Remove any number of explicit Group wrappers for comparison ONLY. */
function ungroup(node) {
  while (node?.type === "Group") node = node.operand;
  return node;
}

export function structurallyEqual(left, right) {
  left = ungroup(left);
  right = ungroup(right);
  if (!left || !right || left.type !== right.type) return false;
  const info = nodeTypeInfo(left);
  // Unknown node types must be registered before they can compare equal.
  if (!info) return false;
  // Compare exact values, so "3", "3.0" and an older saved 3 are all equal.
  if (left.type === "Number") return isExactNumberInput(left.value) && isExactNumberInput(right.value) &&
    equals(left.value, right.value);
  if (Object.keys(meaningFieldsOf(info)).some(key => left[key] !== right[key])) return false;
  const a = childEntries(left), b = childEntries(right);
  return a.length === b.length && a.every((entry, index) =>
    entry.index === b[index].index && structurallyEqual(entry.child, b[index].child));
}
