/* ========================================================================== *
 * Operator precedence / automatic brackets
 * ========================================================================== *
 * This module answers ONLY: "Would printing this child without parentheses
 * change how the expression is read?" It does not change the mathematical
 * tree. Explicit Group nodes always print their own author-chosen brackets.
 *
 * Precedence is a number: larger values bind more tightly. Each operator
 * states its own in its definition (js/definitions/operators/<id>/, Engine stage E3);
 * the current order is Add (10) < Multiply (20) < Negate, Invert (30) <
 * Group and atoms (100).
 *
 * FUTURE EXTENSION: Power, Root, sums, etc. Precedence ALONE is not enough:
 * a-(b-c), (a^b)^c and a/(bc) need associativity / child-position rules. The
 * function below is the central place to add those parent-aware cases instead
 * of scattering them through the renderer, parser and operation modules.
 * ========================================================================== */
import { isAdditionAssociative } from "./operations/addition.js";
import { isMultiplicationAssociative } from "./operations/multiplication.js";
import { isExactNumberInput, isNegative, toExactString } from "./rational.js";
import { OPERATORS } from "../definitions/operators/operators.js";
import { nodeTypeInfo } from "./nodeRegistry.js";

// Numbers, names and function application are atoms, not operators.
const ATOMS = Object.freeze({ Number: { precedence: 100 }, Symbol: { precedence: 100 }, Apply: { precedence: 100 } });
let table = null;
/**
 * Precedence of every node type: the operators' own, plus atoms. Built on
 * first use, because operator definitions import this module (Multiply's
 * print row asks needsVisibleMultiplicationSign).
 */
export function operatorMetadata() {
  table ??= Object.freeze({
    ...Object.fromEntries(OPERATORS.list.filter(operator => operator.node)
      .map(operator => [operator.node, Object.freeze({ precedence: operator.precedence })])),
    ...ATOMS,
  });
  return table;
}

export function needsAutomaticBrackets(parent, child, position = null) {
  // Group already supplies explicit brackets; never add a second pair INSIDE
  // it. A Group child similarly already brings its own visible brackets.
  // A function call's own brackets likewise hold its arguments: \sin(a+b), never \sin((a+b)).
  if (!parent || !child || nodeTypeInfo(parent)?.ownBrackets || child.type === "Group") return false;
  const parentInfo = operatorMetadata()[parent.type];
  const childInfo = operatorMetadata()[child.type];
  if (!parentInfo || !childInfo) {
    // New node types MUST be given a rule here before a renderer supports
    // them; throwing is safer than silently showing ambiguous mathematics.
    throw new TypeError(`Missing bracket metadata for ${parent.type} / ${child.type}.`);
  }
  if (childInfo.precedence < parentInfo.precedence) return true;
  // The divisor of ÷ is bracketed unless it is an atom, so a÷(−b) and
  // a÷(÷b) can never be misread. A fraction-valued number prints with a
  // slash ("2/3"), so as a divisor it is bracketed too: a÷(2/3), never a/2/3.
  if (parent.type === "Invert" && (childInfo.precedence < 100 || isFractionNumber(child))) return true;
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

/**
 * Notation rule: does a factor after the first begin with a sign?
 *
 * Juxtaposition cannot show such a product: `a -c` reads as subtraction, even
 * though the tree is Multiply(a, Negate(c)). The renderer and the text printer
 * both ask this one rule, so the screen and the editable text cannot disagree.
 * It decides notation only; the tree and its displayStyle are never changed.
 * Bracketed factors are unaffected, since a bracket comes first. Future node
 * types that print a leading sign must be added here.
 */
export function startsWithSign(node) {
  if (node?.type === "Negate") return true;
  if (node?.type === "Number") return isExactNumberInput(node.value) && isNegative(node.value);
  // A directly nested product prints without brackets when associative.
  if (node?.type === "Multiply") return !needsAutomaticBrackets({ type: "Multiply" }, node) && startsWithSign(node.operands[0]);
  return false;
}
/** A Number whose exact value prints as a fraction ("2/3"), i.e. with a slash. */
function isFractionNumber(node) {
  return node?.type === "Number" && isExactNumberInput(node.value) && toExactString(node.value).includes("/");
}

/**
 * Notation rule: does a factor END with a division, so that a factor written
 * straight after it would be ambiguous (6÷2 x)? A ÷ factor, a fraction-valued
 * number ("2/3"), or an unbracketed product whose last factor does. The mirror
 * of startsWithSign.
 */
function endsWithDivision(node) {
  if (node?.type === "Invert" || isFractionNumber(node)) return true;
  if (node?.type === "Multiply") return !needsAutomaticBrackets({ type: "Multiply" }, node) && endsWithDivision(node.operands.at(-1));
  return false;
}

// A factor straight after one that ends with a division also needs a visible
// sign: 6÷2·x, never "6÷2 x", which could mean 6÷(2x). The parser refuses that
// form, so the printer and the screen (both asking this rule) never produce it.
export function needsVisibleMultiplicationSign(product, factorIndex) {
  return factorIndex > 0 && (startsWithSign(product.operands[factorIndex]) ||
    endsWithDivision(product.operands[factorIndex - 1]));
}
