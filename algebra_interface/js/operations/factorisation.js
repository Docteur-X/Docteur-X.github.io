/* ========================================================================== *
 * COMMON-FACTOR EXTRACTION — deliberate reverse distributivity
 * ========================================================================== *
 *   AB + AC + AD  ->  A(B+C+D)       common LEFT factor
 *   BA + CA + DA  ->  (B+C+D)A       common RIGHT factor
 *
 * No automatic commuting, insertion of 1, numerical decomposition, or
 * algebraic simplification happens here. Every addend must explicitly be a
 * Multiply with at least two factors. A student must select EXACTLY one
 * matching end-factor from EVERY direct child of the same Add.
 * Teaching restrictions on when students may invoke this mathematical rule
 * belong to teaching/factorisationPolicy.js, NOT this module.
 *
 * This is valid even when multiplication is noncommutative. Left and right
 * extraction are distinct; neither operation permutes factors. We do not
 * require associativity to extract a factor from a two-factor product, but
 * extraction of an end-factor from a product with >2 factors requires
 * associativity (to regroup the remaining factors).
 *
 * getFactorisationPlan is PURE: no DOM, mouse, CSS, or tree mutation.
 * applyFactorisation constructs an independent candidate tree and returns
 * it with provenance. Callers commit it to state/history in ONE transaction.
 * ========================================================================== */
import { createMultiply, createNodeId, cloneExpression } from "../core/nodeFactory.js";
import { findNodeById, findNodeLocation, walkExpression, replaceNodeAtLocation } from "../core/treeUtils.js";
import { structurallyEqual } from "../core/structuralEquality.js";
import { isMultiplicationAssociative } from "./multiplication.js";

/**
 * The Group immediately enclosing the Add defines the student's scope.
 * Group(Group(Add(...))) is supported: the OUTERMOST explicit Group is
 * the extraction boundary, since only that wrapper has a visible hitbox.
 */
function enclosingExplicitGroup(root, sum) {
  const location = findNodeLocation(root, sum.id);
  if (location?.parent?.type !== "Group" || location.index !== "operand") return null;
  let group = location.parent;
  // Nested Group shells render inside the same outer hitbox. Pick the
  // outermost shell so the extraction zone is visibly attached to brackets.
  while (findNodeLocation(root, group.id)?.parent?.type === "Group") {
    group = findNodeLocation(root, group.id).parent;
  }
  return group;
}

/**
 * Determine whether a set of selected factor IDs permits extraction.
 * Selection order never matters; products are checked in Add operand order.
 * A null result means there is no available factorisation action.
 */
export function getFactorisationPlan(root, selectedFactorIds) {
  if (!root || !Array.isArray(selectedFactorIds) || selectedFactorIds.length < 2) return null;
  const unique = new Set(selectedFactorIds);
  if (unique.size !== selectedFactorIds.length) return null;

  const locations = selectedFactorIds.map((id) => findNodeLocation(root, id));
  if (locations.some((location) => !location?.parent || location.parent.type !== "Multiply" ||
      typeof location.index !== "number")) return null;

  const products = locations.map((location) => location.parent);
  if (new Set(products.map((product) => product.id)).size !== products.length) return null;
  const sumLocations = products.map((product) => findNodeLocation(root, product.id));
  const sum = sumLocations[0]?.parent;
  if (sum?.type !== "Add" || !sumLocations.every((location) => location?.parent === sum)) return null;
  // An explicit Group is optional mathematically. The teaching policy
  // separately decides whether this sum has an acceptable visible boundary.
  const group = enclosingExplicitGroup(root, sum);
  if (sum.operands.length < 2 || sum.operands.length !== products.length) return null;
  if (!sum.operands.every((operand) => operand.type === "Multiply" &&
      operand.operands.length >= 2 && products.includes(operand))) return null;

  // Without associativity, AB+AC is still valid; ABC+ADC requires a
  // regrouping of the residual factors and is therefore disallowed.
  if (!isMultiplicationAssociative() && products.some((product) => product.operands.length > 2)) return null;

  const selectedByProduct = new Map(locations.map((location) => [location.parent.id, location]));
  const orderedLocations = sum.operands.map((product) => selectedByProduct.get(product.id));
  const firstFactor = orderedLocations[0].node;
  if (!orderedLocations.every((location) => structurallyEqual(firstFactor, location.node))) return null;

  const isLeft = orderedLocations.every((location) => location.index === 0);
  const isRight = orderedLocations.every((location) =>
    location.index === location.parent.operands.length - 1);
  if (!isLeft && !isRight) return null;
  const direction = isLeft ? "left" : "right";

  return {
    rule: `factorise-${direction}`,
    direction,
    sumId: sum.id,
    groupId: group?.id ?? null,
    // For hit-testing, target the Group when present, otherwise the Add itself.
    scopeNodeId: group?.id ?? sum.id,
    productIds: sum.operands.map((node) => node.id),
    // These IDs are in mathematical order, not the order of Ctrl+clicks.
    sourceFactorIds: orderedLocations.map((location) => location.node.id)
  };
}

/**
 * Create an independent occurrence of a factor with FRESH IDs at every level.
 * Its content is copied; the originals remain in the previous history state.
 * originIdsByNewId is useful for a future history provenance inspector.
 */
function copyExtractedFactor(source) {
  const copy = cloneExpression(source);
  const originIdsByNewId = {};
  walkExpression(copy, (node) => {
    const sourceId = node.id;
    node.id = createNodeId();
    originIdsByNewId[node.id] = [sourceId];
  });
  return { copy, originIdsByNewId };
}

/**
 * Validate the proposal AGAIN at commit time. Never trust a stale preview.
 * Work on a cloned root so failure cannot partially edit the live tree.
 * Existing residual operands, Add and Group retain their IDs. The extracted
 * common factor gets a fresh ID because it represents several occurrences.
 */
export function applyFactorisation(root, requestedPlan) {
  if (!requestedPlan?.sourceFactorIds) return null;
  const plan = getFactorisationPlan(root, requestedPlan.sourceFactorIds);
  if (!plan || plan.direction !== requestedPlan.direction ||
      plan.sumId !== requestedPlan.sumId || plan.groupId !== requestedPlan.groupId ||
      plan.productIds.join("|") !== requestedPlan.productIds.join("|") ||
      plan.sourceFactorIds.join("|") !== requestedPlan.sourceFactorIds.join("|")) return null;

  const resultRoot = cloneExpression(root);
  const sum = findNodeById(resultRoot, plan.sumId);
  const group = plan.groupId ? findNodeById(resultRoot, plan.groupId) : null;
  if (!sum || (plan.groupId && !group)) return null;
  const source = findNodeById(resultRoot, plan.sourceFactorIds[0]);
  const { copy: extractedFactor, originIdsByNewId } = copyExtractedFactor(source);
  const retainedResidualIds = [];
  const retiredProductIds = [];

  // Reuse each original product ID when at least two residual factors remain.
  // For a single residual factor, the product shell disappears and the
  // surviving factor retains its own original ID.
  sum.operands = sum.operands.map((product) => {
    const sourceFactorId = plan.sourceFactorIds[plan.productIds.indexOf(product.id)];
    const factorIndex = product.operands.findIndex((operand) => operand.id === sourceFactorId);
    if (factorIndex < 0) return null; // Defensive; plan already validated.
    const residual = product.operands.filter((_, index) => index !== factorIndex);
    retainedResidualIds.push(...residual.map((node) => node.id));
    if (residual.length === 1) {
      retiredProductIds.push(product.id);
      return residual[0];
    }
    product.operands = residual;
    return product;
  });
  if (sum.operands.some((node) => !node)) return null;

  // Preserve an explicit Group if one exists. Otherwise the residual Add is
  // already a meaningful subtree, and the renderer will supply mandatory
  // parentheses under Multiply. Never invent an explicit Group here.
  const scope = group || sum;
  const factors = plan.direction === "left"
    ? [extractedFactor, scope] : [scope, extractedFactor];
  const resultProduct = createMultiply(factors, "implicit");
  const scopeLocation = findNodeLocation(resultRoot, scope.id);
  if (scopeLocation?.parent) {
    if (!replaceNodeAtLocation(scopeLocation, resultProduct)) return null;
  } else if (resultRoot.id !== scope.id) {
    return null;
  }
  // A standalone Add can be factored by the mathematical API, even though
  // the default teaching policy forbids invoking that action without grouping.
  const outputRoot = scopeLocation?.parent ? resultRoot : resultProduct;

  // Each source occurrence contributes to ONE new factor. For compound
  // factors, representative children also have explicit copy relationships.
  originIdsByNewId[extractedFactor.id] = [...plan.sourceFactorIds];
  return {
    root: outputRoot,
    resultId: resultProduct.id,
    extractedFactorId: extractedFactor.id,
    provenance: {
      rule: plan.rule,
      sourceFactorIds: [...plan.sourceFactorIds],
      extractedFactorId: extractedFactor.id,
      outputProductId: resultProduct.id,
      retainedGroupId: group?.id ?? null,
      retainedSumId: sum.id,
      retainedResidualIds,
      retiredProductIds,
      originIdsByNewId
    }
  };
}
