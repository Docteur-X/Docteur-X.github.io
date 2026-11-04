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
export function walkExpression(node, visitor, parent = null, index = null) {
  if (!node) return;
  visitor(node, parent, index);

  // Relation children are named, not positional array operands.
  if (node.type === "Equal") {
    walkExpression(node.left, visitor, node, "left");
    walkExpression(node.right, visitor, node, "right");
  }
  if (Array.isArray(node.operands)) {
    node.operands.forEach((child, childIndex) => {
      walkExpression(child, visitor, node, childIndex);
    });
  }

  if (node.operand) {
    walkExpression(node.operand, visitor, node, "operand");
  }

  if (Array.isArray(node.arguments)) {
    node.arguments.forEach((child, childIndex) => {
      walkExpression(child, visitor, node, childIndex);
    });
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
 * Evaluate a tree numerically when every leaf has a known value.
 *
 * Returning null means "not currently numeric".  This is intentionally a
 * small evaluator for the current Number/Symbol/Add/Multiply/Negate subset;
 * it is not a replacement for a future full symbolic mathematics engine.
 */
export function evaluateNumericNode(node, substitutions = {}) {
  if (!node) return null;

  switch (node.type) {
    case "Number":
      return Number.isFinite(node.value) ? node.value : null;

    case "Symbol": {
      if (!Object.prototype.hasOwnProperty.call(substitutions, node.name)) return null;
      const value = Number(substitutions[node.name]);
      return Number.isFinite(value) ? value : null;
    }

    case "Add": {
      const values = node.operands.map((child) => evaluateNumericNode(child, substitutions));
      if (values.some((value) => value === null)) return null;
      return values.reduce((sum, value) => sum + value, 0);
    }

    case "Multiply": {
      const values = node.operands.map((child) => evaluateNumericNode(child, substitutions));
      if (values.some((value) => value === null)) return null;
      return values.reduce((product, value) => product * value, 1);
    }

    case "Group":
      // The brackets do not alter the numerical value. This allows (1)+2 and
      // (2+3)*4 to be evaluated without first stripping the brackets.
      return evaluateNumericNode(node.operand, substitutions);

    case "Negate": {
      const value = evaluateNumericNode(node.operand, substitutions);
      return value === null ? null : -value;
    }

    // FunctionCall evaluation will be added alongside a function registry.
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
 * - The top-level root remains an Add node, even for a one-term expression.
 *
 * This function mutates existing nodes where possible, preserving IDs for
 * nodes that remain meaningful after the edit.
 */
export function normaliseExpressionTree(root, canFlatten = () => false) {
  function normalise(node, isRoot = false) {
    if (!node) return null;

    if (node.type === "Equal") {
      node.left = normalise(node.left, true);
      node.right = normalise(node.right, true);
      return node;
    }
    if (node.type === "Group") {
      // Recursively normalise the contents, NOT the explicit Group wrapper.
      // The wrapper must survive even if its child becomes a single value.
      node.operand = normalise(node.operand);
      return node;
    }

    if (node.type === "Negate") {
      node.operand = normalise(node.operand);
      return node;
    }

    if (node.type === "FunctionCall") {
      node.arguments = node.arguments.map((argument) => normalise(argument)).filter(Boolean);
      return node;
    }

    if (node.type !== "Add" && node.type !== "Multiply") return node;

    const normalisedChildren = node.operands
      .map((child) => normalise(child))
      .filter(Boolean);

    const flattened = [];
    for (const child of normalisedChildren) {
      if (canFlatten(node, child)) flattened.push(...child.operands);
      else flattened.push(child);
    }
    node.operands = flattened;

    if (node.type === "Multiply" && node.operands.length === 1) {
      return node.operands[0];
    }

    if (node.type === "Add" && node.operands.length === 1 && !isRoot) {
      return node.operands[0];
    }

    return node;
  }

  const result = normalise(root, true);
  if (result?.type === "Equal" || result?.type === "Add") return result;
  // The app's top-level contract is always a sum node. This branch is mostly
  // defensive; normal drag operations should never remove the final addend.
  return { id: `root-${result?.id || "empty"}`, type: "Add", operands: result ? [result] : [] };
}

/**
 * Replace a node at its known location, regardless of its parent's shape.
 *
 * Arrays (`Add`, `Multiply`, `FunctionCall`) use numeric child indexes;
 * unary wrappers (`Group`, `Negate`) store their child in `.operand`.
 * This utility is useful for wrapping/unwrapping and future rewrite rules.
 * It deliberately does NOT mutate the root itself: the app keeps an Add root.
 */
export function replaceNodeAtLocation(location, replacement) {
  if (!location?.parent || !replacement) return false;
  const { parent, index } = location;
  if ((index === "left" || index === "right") && parent.type === "Equal") {
    parent[index] = replacement;
    return true;
  }
  if (index === "operand" && parent.operand) {
    parent.operand = replacement;
    return true;
  }
  if (typeof index === "number") {
    const array = Array.isArray(parent.operands)
      ? parent.operands : parent.arguments;
    if (!array || index < 0 || index >= array.length) return false;
    array[index] = replacement;
    return true;
  }
  return false;
}
