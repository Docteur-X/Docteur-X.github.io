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
import { toExactString } from "./rational.js";
import { nodeTypeInfo } from "./nodeRegistry.js";

export function toMathJSON(node) {
  if (!node) throw new TypeError("Cannot convert an empty expression to MathJSON.");

  switch (node.type) {
    // Any relation (Equal, Less, Greater): its MathJSON head from the node registry.
    case nodeTypeInfo(node)?.relation && node.type: return [nodeTypeInfo(node).mathJsonHead, toMathJSON(node.left), toMathJSON(node.right)];
    case "Number": {
      // A plain JSON number when that is exact; otherwise MathJSON's string
      // number form, so no digit is lost (for example 1234567890123456789).
      const exact = toExactString(node.value);
      return String(Number(exact)) === exact ? Number(exact) : { num: exact };
    }

    case "Symbol":
      return node.name;

    case "Add":
      // Historical documents can contain a one-term Add. Its value is
      // simply that of its child; new parser roots no longer create it.
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

    case "Invert":
      // a÷b is a·b⁻¹; MathJSON writes the inverse as a power of −1.
      return ["Power", toMathJSON(node.operand), -1];

    case "Apply": {
      const functionHead = STANDARD_FUNCTION_NAMES[node.operator.toLowerCase()] || node.operator;
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
