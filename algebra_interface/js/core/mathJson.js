/* ========================================================================== *
 * MathJSON conversion
 * ========================================================================== *
 * Converts the app's internal expression tree into MathJSON-style arrays and
 * primitive values.  Node IDs and display metadata are intentionally omitted:
 * they belong to the editor, not to the mathematical expression.
 *
 * This is a one-way converter for now.  A future fromMathJSON() function can
 * be added next to this one when importing MathJSON becomes a requirement.
 * ========================================================================== */

const STANDARD_FUNCTION_NAMES = Object.freeze({
  sin: "Sin",
  cos: "Cos",
  tan: "Tan",
  arcsin: "Arcsin",
  arccos: "Arccos",
  arctan: "Arctan",
  ln: "Ln",
  log: "Log",
  exp: "Exp",
  sqrt: "Sqrt"
});

/** Convert one internal node recursively into a MathJSON expression. */
export function toMathJSON(node) {
  if (!node) throw new TypeError("Cannot convert an empty expression to MathJSON.");

  switch (node.type) {
    case "Equal": return ["Equal", toMathJSON(node.left), toMathJSON(node.right)];
    case "Number":
      return node.value;

    case "Symbol":
      return node.name;

    case "Add":
      // The editor keeps an Add root even for a one-term expression. MathJSON
      // should not emit a redundant unary Add, so unwrap that editor container.
      return node.operands.length === 1
        ? toMathJSON(node.operands[0])
        : ["Add", ...node.operands.map(toMathJSON)];

    case "Multiply":
      return ["Multiply", ...node.operands.map(toMathJSON)];

    case "Group":
      // Explicit brackets belong to the editing experience, not the value.
      // The complete editor tree (including bracketStyle) is saved in history.
      return toMathJSON(node.operand);

    case "Negate":
      return ["Negate", toMathJSON(node.operand)];

    case "FunctionCall": {
      const functionHead = STANDARD_FUNCTION_NAMES[node.name.toLowerCase()] || node.name;
      return [functionHead, ...node.arguments.map(toMathJSON)];
    }

    default:
      throw new TypeError(`MathJSON conversion does not yet support node type: ${node.type}`);
  }
}

/** Return a pretty-printed MathJSON string suitable for the inspector panel. */
export function mathJSONToString(node) {
  return JSON.stringify(toMathJSON(node), null, 2);
}
