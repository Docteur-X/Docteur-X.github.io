/* ========================================================================== *
 * Operator precedence / automatic brackets
 * ========================================================================== *
 * This module answers ONLY: "Would printing this child without parentheses
 * change how the expression is read?" It does not change the mathematical
 * tree. Explicit Group nodes always print their own author-chosen brackets.
 *
 * Precedence is a number: larger values bind more tightly. The current order:
 *   Add (10) < Multiply (20) < Negate (30) < atom (100).
 *
 * FUTURE EXTENSION: Power, Divide, Root, FunctionCall, sums, etc. each gain
 * entries here. Precedence ALONE is not enough:  a-(b-c), (a^b)^c and a/(bc)
 * need associativity / child-position rules. The switch below is the central
 * place to add those parent-aware cases instead of scattering them through
 * the renderer, parser and operation modules.
 * ========================================================================== */
import { isAdditionAssociative } from "../operations/addition.js";
import { isMultiplicationAssociative } from "../operations/multiplication.js";

export const OPERATOR_METADATA = Object.freeze({
  Add: { precedence: 10, associativity: "associative" },
  Multiply: { precedence: 20, associativity: "associative" },
  Negate: { precedence: 30, associativity: "unary" },
  Number: { precedence: 100 },
  Symbol: { precedence: 100 },
  Group: { precedence: 100 },
  FunctionCall: { precedence: 100 }
});

export function needsAutomaticBrackets(parent, child, position = null) {
  // Group already supplies explicit brackets; never add a second pair INSIDE
  // it. A Group child similarly already brings its own visible brackets.
  if (!parent || !child || parent.type === "Group" || child.type === "Group") return false;
  const parentInfo = OPERATOR_METADATA[parent.type];
  const childInfo = OPERATOR_METADATA[child.type];
  if (!parentInfo || !childInfo) {
    // New node types MUST be given a rule here before a renderer supports
    // them; throwing is safer than silently showing ambiguous mathematics.
    throw new TypeError(`Missing bracket metadata for ${parent.type} / ${child.type}.`);
  }
  if (childInfo.precedence < parentInfo.precedence) return true;
  // Examples: a+(b*c) needs no extra brackets, (a+b)*c does.
  // Same-precedence children need explicit brackets if associativity is NOT
  // available. This is not a Group node: it merely prevents an ambiguous
  // rendered or serialized formula. Equal precedence of DIFFERENT operators
  // will need position-aware metadata as the mathematical language grows.
  if (childInfo.precedence === parentInfo.precedence && parent.type === child.type) {
    if (parent.type === "Add") return !isAdditionAssociative();
    if (parent.type === "Multiply") return !isMultiplicationAssociative();
  }
  return false;
}
