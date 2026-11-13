/* ========================================================================== *
 * Explicit grouping operations
 * ========================================================================== *
 * Group is like a transparent mathematical envelope. Wrapping a node does
 * NOT move it to a different sum or product, and unwrapping a node does NOT
 * distribute multiplication: those are separate transformations.
 *
 * IMPORTANT: If Add is directly inside Multiply without Group, the renderer
 * still inserts MANDATORY parentheses because of operator precedence. In
 * other words, a Group's absence does not imply brackets should disappear
 * from the displayed mathematics.
 * ========================================================================== */
import { createGroup, GROUP_BRACKETS } from "../nodeFactory.js";
import { findNodeLocation, replaceNodeAtLocation } from "../treeUtils.js";

/** Wrap one selected expression node, retaining its existing node ID inside. */
export function wrapNodeInGroup(root, nodeId, bracketStyle = "round") {
  if (!Object.hasOwn(GROUP_BRACKETS, bracketStyle)) return null;
  const location = findNodeLocation(root, nodeId);
  if (!location) return null;
  const group = createGroup(location.node, bracketStyle);
  // A root has no parent to mutate. Return the new Group and let the
  // application replace its authoritative root reference explicitly.
  if (!location.parent) return group;
  return replaceNodeAtLocation(location, group) ? group : null;
}

/** Remove ONE explicit Group shell; do not otherwise rewrite its contents. */
export function removeGroup(root, groupId) {
  const location = findNodeLocation(root, groupId);
  if (!location || location.node.type !== "Group") return null;
  const unwrapped = location.node.operand;
  // Preserve the surviving child ID when unwrapping a root Group.
  if (!location.parent) return unwrapped;
  return replaceNodeAtLocation(location, unwrapped) ? unwrapped : null;
}

/* -------------------------------------------------------------------------- *
 * Range grouping — an intentional application of associativity
 * -------------------------------------------------------------------------- *
 * Example: Add(a,b,c,d) -> Add(a, Group(Add(b,c)), d).
 *
 * This is NOT the same as wrapping one existing subtree. We are creating a
 * new inner operation from a consecutive RANGE of siblings. Only the relevant
 * operation module may permit that regrouping. A non-associative operation
 * cannot grant permission, even if the selected children are adjacent.
 *
 * Validation is pure: previews can call getRangeGroupingPlan repeatedly
 * without changing node IDs, history, or the mathematical tree.
 * -------------------------------------------------------------------------- */
import { createAdd, createMultiply } from "../nodeFactory.js";
import { isAdditionAssociative } from "./addition.js";
import { isMultiplicationAssociative } from "./multiplication.js";

/** Return a stable description of an eligible range, or null. */
export function getRangeGroupingPlan(root, selectedNodeIds) {
  if (!Array.isArray(selectedNodeIds) || selectedNodeIds.length < 2) return null;
  const unique = [...new Set(selectedNodeIds)];
  if (unique.length !== selectedNodeIds.length) return null;
  const locations = unique.map((id) => findNodeLocation(root, id));
  if (locations.some((location) => !location?.parent || typeof location.index !== "number")) return null;

  const parent = locations[0].parent;
  if (!locations.every((location) => location.parent === parent)) return null;
  if (parent.type !== "Add" && parent.type !== "Multiply") return null;
  if (parent.type === "Add" && !isAdditionAssociative()) return null;
  if (parent.type === "Multiply" && !isMultiplicationAssociative()) return null;

  const indexes = locations.map((location) => location.index).sort((a, b) => a - b);
  const start = indexes[0];
  const end = indexes[indexes.length - 1];
  if (end - start + 1 !== unique.length) return null;
  return {
    rule: "group-operand-range",
    parentId: parent.id,
    parentType: parent.type,
    start,
    count: unique.length,
    wholeParent: start === 0 && unique.length === parent.operands.length,
    // Always use expression order, regardless of Ctrl+click order.
    operandIds: parent.operands.slice(start, end + 1).map((node) => node.id)
  };
}

/**
 * Commit one validated range grouping. Nothing is changed on failure.
 *
 * The original parent and EVERY selected operand keep their IDs and object
 * identities. Exactly two new nodes are allocated: an inner Add/Multiply and
 * its explicit Group wrapper. This makes the transformation easy to trace in
 * history and lets subsequent rules act on the grouped operands normally.
 */
export function groupOperandRange(root, selectedNodeIds, bracketStyle = "round") {
  if (!Object.hasOwn(GROUP_BRACKETS, bracketStyle)) return null;
  const plan = getRangeGroupingPlan(root, selectedNodeIds);
  if (!plan) return null;
  const parent = findNodeLocation(root, plan.parentId)?.node;
  if (!parent || !Array.isArray(parent.operands)) return null;

  // Validate the exact source slice immediately before mutation, so a stale
  // preview cannot accidentally group different operands after another edit.
  const operands = parent.operands.slice(plan.start, plan.start + plan.count);
  if (operands.map((node) => node.id).some((id, index) => id !== plan.operandIds[index])) return null;
  // Special case: all children of a NON-ROOT parent are selected. Wrapping
  // that existing parent is both simpler and safer than creating a duplicate
  // inner operation and leaving a one-child outer Multiply that normalisation
  // would collapse. The original operation node and its ID are preserved.
  const parentLocation = findNodeLocation(root, parent.id);
  if (plan.wholeParent && parentLocation?.parent) {
    const group = createGroup(parent, bracketStyle);
    if (!replaceNodeAtLocation(parentLocation, group)) return null;
    return {
      group, inner: parent, plan,
      provenance: {
        rule: "group-operand-range",
        parentId: parent.id,
        preservedOperandIds: [...plan.operandIds],
        createdNodeIds: [group.id],
        bracketStyle
      }
    };
  }

  // Proper subset (or the editor's structural Add root): create a new inner
  // operation containing the EXISTING operand objects. The explicit Group
  // prevents the associative normalizer from flattening across this boundary.
  const inner = parent.type === "Add"
    ? createAdd(operands)
    : createMultiply(operands, parent.displayStyle);
  const group = createGroup(inner, bracketStyle);
  parent.operands.splice(plan.start, plan.count, group);

  return {
    group, inner, plan,
    provenance: {
      rule: "group-operand-range",
      parentId: parent.id,
      preservedOperandIds: [...plan.operandIds],
      createdNodeIds: [inner.id, group.id],
      bracketStyle
    }
  };
}
