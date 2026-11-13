/* ========================================================================== *
 * Expression-tree traversal and general-purpose utilities
 * ========================================================================== *
 * This module knows how to walk the tree, but it does not decide what an
 * algebraic operation means.  Operation-specific rules live in operations/.
 * ========================================================================== */

/**
 * Visit every node in an expression tree, depth first.
 *
 * `visitor(node, parent, index)` receives the current node plus its structural
 * context.  The same traversal supports symbol collection, ID lookup,
 * validation, serialisation preparation and future accessibility features.
 */
import { add, isExactNumberInput, multiply, negate, parseExact, isZero } from "./rational.js";
import { childEntries, mapChildrenInPlace, replaceChildAt } from "./nodeRegistry.js";

export function walkExpression(node, visitor, parent = null, index = null) {
  if (!node) return;
  visitor(node, parent, index);

  // The node registry says where each type keeps its children: a list index,
  // or a key ("operand", or a relation's "left" / "right").
  for (const { child, index: childIndex } of childEntries(node)) {
    walkExpression(child, visitor, node, childIndex);
  }
}

/** Find a node by its stable ID. */
export function findNodeById(root, nodeId) {
  let found = null;
  walkExpression(root, (node) => {
    if (node.id === nodeId) found = node;
  });
  return found;
}

/**
 * Find both a node and its immediate parent container.
 *
 * `parent` may also be Group or Negate; in that case `index` is the string
 * "operand" rather than an integer. Add/Multiply use parent.operands indices.  Root nodes have no parent and are not draggable in the
 * current editor.  Returning this location is what lets drag-and-drop modify
 * the tree rather than an unrelated flat list.
 */
export function findNodeLocation(root, nodeId) {
  let location = null;
  walkExpression(root, (node, parent, index) => {
    if (node.id === nodeId) location = { node, parent, index };
  });
  return location;
}

/** Collect distinct symbol names in the order they first appear. */
export function getUniqueSymbolNames(root) {
  const names = [];
  const seen = new Set();

  walkExpression(root, (node) => {
    if (node.type !== "Symbol" || seen.has(node.name)) return;
    seen.add(node.name);
    names.push(node.name);
  });

  return names;
}

/**
 * Evaluate a tree EXACTLY when every leaf has a known value.
 *
 * Returns an exact rational value (see rational.js), or null meaning "not
 * currently numeric". A result too large to work with throws
 * NumberTooLargeError rather than returning a rounded answer. This is a small
 * evaluator for the current Number/Symbol/Add/Multiply/Negate subset, not a
 * replacement for a future symbolic engine.
 */
export function evaluateNumericNode(node, substitutions = {}) {
  if (!node) return null;

  switch (node.type) {
    case "Number":
      return isExactNumberInput(node.value) ? parseExact(node.value) : null;

    case "Symbol": {
      if (!Object.prototype.hasOwnProperty.call(substitutions, node.name)) return null;
      const value = substitutions[node.name];
      return isExactNumberInput(value) ? parseExact(value) : null;
    }

    case "Add": {
      const values = node.operands.map((child) => evaluateNumericNode(child, substitutions));
      if (values.some((value) => value === null)) return null;
      return values.reduce((sum, value) => add(sum, value), parseExact(0));
    }

    case "Multiply": {
      const values = node.operands.map((child) => evaluateNumericNode(child, substitutions));
      if (values.some((value) => value === null)) return null;
      return values.reduce((product, value) => multiply(product, value), parseExact(1));
    }

    case "Group":
      // The brackets do not alter the numerical value. This allows (1)+2 and
      // (2+3)*4 to be evaluated without first stripping the brackets.
      return evaluateNumericNode(node.operand, substitutions);

    case "Negate": {
      const value = evaluateNumericNode(node.operand, substitutions);
      return value === null ? null : negate(value);
    }

    case "Invert": {
      // 1÷x exactly. Division by zero has no value: null, so no rule can
      // evaluate it (numeric combination explains why to the student).
      const value = evaluateNumericNode(node.operand, substitutions);
      if (value === null || isZero(value)) return null;
      const { numerator, denominator } = parseExact(value);
      return parseExact(`${denominator * (numerator < 0n ? -1n : 1n)}/${numerator < 0n ? -numerator : numerator}`);
    }

    // Apply (functions) gains a value with operator definitions (stage E3).
    default:
      return null;
  }
}

/**
 * Reorder one child within an associative parent node.
 *
 * This helper deliberately checks the parent's type.  A term in an Add node
 * may only be reordered amongst addends; a factor in a Multiply node may only
 * be reordered amongst factors.  That prevents accidental structural changes
 * such as dragging a factor out of a product and silently turning it into a
 * separate addend.
 */
export function reorderChild(parent, childId, destinationIndex) {
  if (!parent || !["Add", "Multiply"].includes(parent.type)) return false;

  const sourceIndex = parent.operands.findIndex((child) => child.id === childId);
  if (sourceIndex < 0) return false;

  const [movingNode] = parent.operands.splice(sourceIndex, 1);
  const safeIndex = Math.max(0, Math.min(destinationIndex, parent.operands.length));
  parent.operands.splice(safeIndex, 0, movingNode);
  return true;
}

/**
 * Replace a specific child in an Add/Multiply parent.
 *
 * Numeric combining uses this after removing the dragged child.  The target's
 * location is looked up again by ID rather than trusting a potentially stale
 * index from the pointer-down event.
 */
export function replaceChild(parent, childId, replacement) {
  if (!parent || !Array.isArray(parent.operands)) return false;
  const index = parent.operands.findIndex((child) => child.id === childId);
  if (index < 0) return false;
  parent.operands.splice(index, 1, replacement);
  return true;
}

/**
 * Restore the normal tree invariants after a drag has temporarily removed a
 * child from its parent.
 *
 * - A directly nested operation flattens ONLY when the supplied mathematical
 *   permission callback returns true. The default callback denies flattening.
 * - An explicit Group NEVER disappears or gets flattened across.
 * - A Multiply with one remaining factor collapses to that factor.
 * - Any one-child Add/Multiply collapses to its sole child, including roots.
 *   This preserves semantic scope: a Number, Group or Negate is not a sum.
 *
 * This function mutates existing nodes where possible, preserving IDs for
 * nodes that remain meaningful after the edit.
 */
export function normaliseExpressionTree(root, canFlatten = () => false) {
  function normalise(node) {
    if (!node) return null;

    // Only Add and Multiply flatten and collapse. Every other node (a
    // relation, a Group, which must survive even around a single value, a
    // unary Negate / Invert, an Apply) just has its children normalised.
    if (node.type !== "Add" && node.type !== "Multiply") return mapChildrenInPlace(node, normalise);

    const normalisedChildren = node.operands
      .map((child) => normalise(child))
      .filter(Boolean);

    const flattened = [];
    for (const child of normalisedChildren) {
      if (canFlatten(node, child)) flattened.push(...child.operands);
      else flattened.push(child);
    }
    node.operands = flattened;

    if ((node.type === "Multiply" || node.type === "Add") && node.operands.length === 1) {
      return node.operands[0];
    }

    return node;
  }

  // No synthetic root is inserted. The caller owns its root reference and
  // must use this return value when normalization collapses an operation.
  return normalise(root);
}

/**
 * Replace a node at its known location, regardless of its parent's shape.
 *
 * Lists (`Add`, `Multiply`, `Apply`) use numeric child indexes; unary
 * wrappers store their child in `.operand`, relations in `.left` / `.right`
 * (the node registry knows each shape).
 * This utility is useful for wrapping/unwrapping and future rewrite rules.
 * Root replacements are handled by callers because a root has no parent.
 */
export function replaceNodeAtLocation(location, replacement) {
  if (!location?.parent || !replacement) return false;
  return replaceChildAt(location.parent, location.index, replacement);
}
