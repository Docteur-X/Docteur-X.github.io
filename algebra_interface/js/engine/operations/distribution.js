/* ========================================================================== *
 * LEFT AND RIGHT DISTRIBUTION — pure mathematical rules, never DOM code.
 * ========================================================================== *
 * A(B+C) = AB+AC       (factor is to the LEFT of the sum)
 * (A+B)C = AC+BC       (factor is to the RIGHT of the sum)
 *
 * Why is the direction explicit? Matrix multiplication is generally NOT
 * commutative. We must not silently turn (A+B)C into CA+CB. The source factor
 * is copied either before or after EACH original addend, retaining its order.
 *
 * The UI has TWO stages: a temporary preview, then a confirmed rewrite.
 * getDistributionPlan() only answers whether the rewrite is available.
 * applyDistribution() validates once more and then edits the tree. Neither
 * function ever touches the browser, pointer coordinates, CSS or animations.
 *
 * Initial restriction: the chosen factor and a Group(Add(...)) (or a bare Add)
 * must be ADJACENT factors in a single Multiply. It prevents implicitly
 * commuting across intervening factors. Other factors remain outside the
 * newly formed sum, and automatic precedence parentheses keep the meaning.
 *
 * Example: X*A*(B+C)*Y, distributing A into the sum yields X*(AB+AC)*Y.
 * Distribution and factorisation are intentionally DIFFERENT operations.
 * ========================================================================== */
import { createAdd, createMultiply, createNodeId, cloneExpression } from "../nodeFactory.js";
import { findNodeById, findNodeLocation, replaceNodeAtLocation, walkExpression } from "../treeUtils.js";

/** Return a bare Add only when a factor consists entirely of Groups around it. */
export function unwrapGroupedSum(factor) {
  let inside = factor;
  while (inside?.type === "Group") inside = inside.operand;
  return inside?.type === "Add" ? inside : null;
}

/**
 * Find one mathematically legitimate distribution, without changing the tree.
 * The explicit sumId identifies WHICH plus-sign the student pointed at.
 * This avoids distributing into a deeper unrelated sum by accident.
 */
export function getDistributionPlan(product, sourceFactorId, sumId) {
  if (product?.type !== "Multiply" || !Array.isArray(product.operands)) return null;
  const sourceIndex = product.operands.findIndex((item) => item.id === sourceFactorId);
  const targetIndex = product.operands.findIndex((item) => unwrapGroupedSum(item)?.id === sumId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return null;
  // No adjacency => would require swapping factors, which may be forbidden.
  if (Math.abs(sourceIndex - targetIndex) !== 1) return null;
  const sum = unwrapGroupedSum(product.operands[targetIndex]);
  if (!sum || sum.operands.length < 2) return null;
  return {
    productId: product.id,
    sourceFactorId,
    sumId,
    direction: sourceIndex < targetIndex ? "left" : "right"
  };
}

/**
 * Make a new *occurrence* of the source factor, rather than a history copy.
 * A historical snapshot keeps all IDs; an algebraic duplication needs new IDs
 * for every nested node. The originMap records the old -> new relationship for
 * future term tracing, including children of a copied compound expression.
 */
function cloneFactorForDistribution(source, originMap = {}) {
  const copy = cloneExpression(source);
  walkExpression(copy, (node) => {
    const originalId = node.id;
    node.id = createNodeId();
    if (!originMap[originalId]) originMap[originalId] = [];
    originMap[originalId].push(node.id);
  });
  return copy;
}

/**
 * Commit a previously proposed expansion.
 *
 * Returns null (without editing the tree) if the plan is no longer applicable.
 * On success returns the NEW root and a JSON-compatible provenance record.
 * The original addends are *moved*, not cloned, so their node IDs survive.
 * All duplicate source factors acquire fresh node IDs.
 *
 * This function replaces the complete Multiply only when exactly two factors
 * participated. When other factors exist, its ID survives and only the two
 * neighbouring factors are replaced by a new Add factor.
 */
export function applyDistribution(root, requestedPlan) {
  // Distribution applies to a Multiply subtree, regardless of whether the
  // enclosing document root is Add, Equal, or a future statement type.
  if (!requestedPlan || !root) return null;
  const product = findNodeById(root, requestedPlan.productId);
  const plan = getDistributionPlan(product, requestedPlan.sourceFactorId, requestedPlan.sumId);
  if (!plan || plan.direction !== requestedPlan.direction) return null;

  const sourceIndex = product.operands.findIndex((node) => node.id === plan.sourceFactorId);
  const targetIndex = product.operands.findIndex((node) => unwrapGroupedSum(node)?.id === plan.sumId);
  const source = product.operands[sourceIndex];
  const targetSum = unwrapGroupedSum(product.operands[targetIndex]);
  const originMap = {};

  // Each new product reuses ONE original addend and has ONE NEW source factor.
  // This preserves b/c/d IDs in a(b+c+d) but creates three independent a IDs.
  const expandedTerms = targetSum.operands.map((addend) => {
    const copiedFactor = cloneFactorForDistribution(source, originMap);
    const orderedFactors = plan.direction === "left"
      ? [copiedFactor, addend] : [addend, copiedFactor];
    return createMultiply(orderedFactors, product.displayStyle || "implicit");
  });
  const expandedSum = createAdd(expandedTerms);

  let newRoot = root;
  if (product.operands.length === 2) {
    // e.g. a(b+c) -> ab+ac. This replaces the entire product subtree.
    // Its parent might be Add or Group; neither needs to know mathematics.
    const location = findNodeLocation(root, product.id);
    // Root-level distribution is a legitimate rewrite. There is no
    // synthetic Add parent any more, so return the new sum as the root.
    if (!location) return null;
    if (location.parent) {
      if (!replaceNodeAtLocation(location, expandedSum)) return null;
    } else {
      newRoot = expandedSum;
    }
  } else {
    // e.g. x*a*(b+c)*y -> x*(ab+ac)*y. No commuting is involved.
    const first = Math.min(sourceIndex, targetIndex);
    product.operands.splice(first, 2, expandedSum);
  }

  return {
    root: newRoot,
    resultId: expandedSum.id,
    provenance: {
      rule: plan.direction === "left" ? "distribute-left" : "distribute-right",
      productBeforeId: plan.productId,
      sourceFactorId: plan.sourceFactorId,
      sourceSumId: plan.sumId,
      producedSumId: expandedSum.id,
      // A map also covers children of complex copied factors, e.g. (x+y).
      copiesBySourceId: originMap,
      // This tells a future history inspector which original addends survived.
      retainedAddendIds: targetSum.operands.map((node) => node.id)
    }
  };
}
