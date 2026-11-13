/* ========================================================================== *
 * Rule-aware normalization — the ONLY normalizer used by application/parser.
 * ========================================================================== *
 * The generic tree utility does not know algebra. It asks this adapter whether
 * a directly nested same-type operation is allowed to flatten. Addition and
 * multiplication each own their own associativity permission. This small
 * adapter prevents circular imports between nodeFactory, treeUtils and rules.
 * Explicit Group nodes always stop flattening at the wrapper boundary.
 * ========================================================================== */
import { normaliseExpressionTree } from "./treeUtils.js";
import { canFlattenAddition } from "./operations/addition.js";
import { canFlattenMultiplication } from "./operations/multiplication.js";

export function normaliseWithRules(root) {
  return normaliseExpressionTree(root, (parent, child) =>
    canFlattenAddition(parent, child) || canFlattenMultiplication(parent, child)
  );
}
