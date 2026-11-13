// FROZEN COPY of js/engine/parser.js as it was before Engine stage E2 (12 November 2026).
// The oracle for tests/engine/parser-equivalence.test.js: the table-driven parser must
// give the same tree or the same error message for every input, and the same
// printed text for every tree. Do not edit; delete once E3 has settled.
/* ========================================================================== *
 * Text input <-> expression tree
 * ========================================================================== *
 * GRAMMAR (highest precedence is at the bottom):
 *
 *   sum      := product (("+" | "-") product)*
 *   product  := signedFactor (("*" | "×" | "·" | implicit) signedFactor)*
 *   signedFactor := ("+" | "-")* atom
 *   atom     := number | identifier | openBracket sum closeBracket
 *
 * The parser is RECURSIVE DESCENT: each grammar level has a method. When a
 * bracket opens, parseAtom() calls parseSum() AGAIN on the portion inside it.
 * This is recursion: a function can ask the same set of functions to solve a
 * smaller instance of the same problem. The call stack remembers which opening
 * bracket is waiting for a closing bracket; no manual bracket-pair search is
 * necessary. Example: (a+[b*c]) works by nesting two parseSum() calls.
 *
 * Brackets (), [], {} are all explicit Group nodes retaining their own style.
 * |...| is reserved for absolute value; < and > are NOT grouping syntax.
 * An unmatched/mismatched bracket throws an explanatory error for the hint bar.
 *
 * Identifiers: ab is ONE symbol, not a*b; _a _b are two symbols multiplied.
 * a(b+c) currently means a times (b+c), NOT a function call.
 * Function calls remain reserved for later grammar work.
 * ========================================================================== */

import {
  GROUP_BRACKETS, createAdd, createGroup, createMultiply, createNegate, createInvert,
  createNumber, createSymbol
} from "../../js/engine/nodeFactory.js";
import { needsAutomaticBrackets, needsVisibleMultiplicationSign } from "../../js/engine/operatorMetadata.js";
import { formatExact, isNegative, negate } from "../../js/engine/rational.js";
import { createEqual } from "../../js/engine/relations/equality.js";
import { normaliseWithRules } from "../../js/engine/normalization.js";
import { isAdditionAssociative } from "../../js/engine/operations/addition.js";
import { isMultiplicationAssociative } from "../../js/engine/operations/multiplication.js";

const OPEN_STYLE = { "(": "round", "[": "square", "{": "curly" };
const CLOSE_TO_OPEN = { ")": "(", "]": "[", "}": "{" };

/** Convert source text into tokens, tracking whitespace for implicit products. */
function tokenize(source) {
  const input = String(source);
  const tokens = [];
  let index = 0;
  let whitespaceBefore = false;

  function push(type, value, extra = {}) {
    tokens.push({ type, value, whitespaceBefore, position: index, ...extra });
    whitespaceBefore = false;
  }

  while (index < input.length) {
    const remaining = input.slice(index);
    const space = remaining.match(/^\s+/u);
    if (space) {
      whitespaceBefore = true;
      index += space[0].length;
      continue;
    }
    const ch = input[index];
    if (Object.hasOwn(OPEN_STYLE, ch)) {
      push("open", ch, { style: OPEN_STYLE[ch] });
      index += 1;
    } else if (Object.hasOwn(CLOSE_TO_OPEN, ch)) {
      push("close", ch);
      index += 1;
    } else if (ch === "+" || ch === "-") {
      push(ch === "+" ? "plus" : "minus", ch);
      index += 1;
    } else if ("*·⋅×".includes(ch)) {
      push("multiply", ch, { displayStyle: ch === "×" ? "times" : "dot" });
      index += 1;
    } else if (ch === "÷" || ch === "/") {
      // Division (owner, 12 November 2026): both signs mean multiplying by
      // the inverse, a÷b = Multiply(a, Invert(b)), shown as ÷.
      push("divide", ch);
      index += 1;
    } else {
      const number = remaining.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/u);
      const explicit = remaining.match(/^_([\p{L}][\p{L}\p{N}_]*)/u);
      const identifier = remaining.match(/^[\p{L}][\p{L}\p{N}_]*/u);
      if (number) {
        push("number", number[0]);
        index += number[0].length;
      } else if (explicit) {
        push("identifier", explicit[1]);
        index += explicit[0].length;
      } else if (identifier) {
        push("identifier", identifier[0]);
        index += identifier[0].length;
      } else if ("|<>".includes(ch)) {
        throw new Error(`“${ch}” is reserved for a future operation; use (), [] or {} for grouping.`);
      } else {
        throw new Error(`I could not understand “${ch}” at position ${index + 1}.`);
      }
    }
  }
  if (tokens.length === 0) throw new Error("Please enter an expression first.");
  return tokens;
}

class ExpressionParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }
  current() { return this.tokens[this.position] || null; }
  consume() { return this.tokens[this.position++] || null; }

  /** Return the actual outermost expression, never a synthetic one-term sum. */
  parseRoot() {
    const expression = this.parseSum();
    const extra = this.current();
    if (extra) {
      if (extra.type === "close") {
        throw new Error(`Unmatched closing bracket “${extra.value}” at position ${extra.position + 1}.`);
      }
      throw new Error(`Unexpected “${extra.value}” at position ${extra.position + 1}.`);
    }
    return expression;
  }

  /** Addition has lower precedence than multiplication. */
  parseSum() {
    const operands = [this.parseProduct()];
    while (["plus", "minus"].includes(this.current()?.type)) {
      const operator = this.consume();
      if (!this.current() || this.current()?.type === "close") {
        throw new Error(`A ${operator.value} sign needs an expression after it.`);
      }
      const term = this.parseProduct();
      // Subtraction is addition of the additive inverse. Keep the Negate
      // node explicit rather than normalizing it away: it is a manipulable
      // mathematical occurrence, with its own minus operator hitbox.
      operands.push(operator.type === "minus" ? createNegate(term) : term);
    }
    // A nested sum with only one item is that item. Group records its own
    // boundary separately; no artificial one-child Add is required here.
    if (operands.length === 1) return operands[0];
    // When associativity is disabled, retain LEFT-nested Add nodes. Without
    // this the parser would still create an n-ary sum and silently assume
    // regrouping. The renderer supplies the mandatory parentheses.
    return isAdditionAssociative() ? createAdd(operands)
      : operands.slice(1).reduce((acc, next) => createAdd([acc, next]), operands[0]);
  }

  /** Read adjacent factors and explicit multiplication signs. */
  parseProduct() {
    const operands = [this.parseSignedFactor()];
    let displayStyle = "implicit";
    let explicitStyleSeen = false;

    while (this.current()) {
      const next = this.current();
      if (next.type === "divide") {
        this.consume();
        if (!this.current() || this.current().type === "close") {
          throw new Error(`The division sign “${next.value}” needs a divisor after it.`);
        }
        operands.push(createInvert(this.parseSignedFactor()));
        continue;
      }
      if (next.type === "multiply") {
        this.consume();
        // A sign may follow: a*-b is a times -b. parseSignedFactor validates it.
        if (!this.current() || this.current().type === "close") {
          throw new Error(`The multiplication sign “${next.value}” needs a factor after it.`);
        }
        operands.push(this.parseSignedFactor());
        if (!explicitStyleSeen) {
          displayStyle = next.displayStyle;
          explicitStyleSeen = true;
        }
        continue;
      }
      if (!this.canStartFactor(next)) break;
      const previous = operands[operands.length - 1];
      // Adjacent brackets always mean multiplication: 2(a+b), (a+b)(c+d).
      // Whitespace separates independent identifiers: "a b" means a*b.
      // A number followed by a name (2x), or a bracket followed by a name
      // ((a+b)c), also means multiplication. "ab" stays one Symbol token.
      // After a divisor, juxtaposition WITHOUT a space is ambiguous: 6÷2x is
      // read as 6÷(2x) in some books and (6÷2)x in others, so it is refused
      // (owner, 12 November 2026: a bad notation that hides ambiguity). A
      // space starts a new factor: 6÷2 x is 6÷2×x.
      if (previous.type === "Invert" && !next.whitespaceBefore &&
          (next.type === "open" || next.type === "identifier" || next.type === "number")) {
        throw new Error("A factor written straight after a divisor is ambiguous (6÷2x could mean 6÷(2x) or 6÷2×x): put the divisor in brackets, 6÷(2x), or separate the next factor with × or a space, 6÷2×x or 6÷2 x.");
      }
      const implicit = next.type === "open" || next.whitespaceBefore ||
        (next.type === "identifier" && (previous.type === "Number" || previous.type === "Group"));
      if (!implicit) break;
      operands.push(this.parseSignedFactor());
    }
    if (operands.length === 1) return operands[0];
    // Same reasoning for nonassociative multiplication: keep each binary
    // multiplication step as its own node, including a visible bracket pair.
    return isMultiplicationAssociative() ? createMultiply(operands, displayStyle)
      : operands.slice(1).reduce((acc, next) => createMultiply([acc, next], displayStyle), operands[0]);
  }

  canStartFactor(token) {
    return Boolean(token && ["number", "identifier", "open"].includes(token.type));
  }

  /**
   * Parse unary signs recursively. A bare -3 remains an atomic Number(-3),
   * while -(3) is an explicit Negate(Group(Number(3))). Repeated signs are
   * represented structurally, so --b is not silently simplified to b.
   */
  parseSignedFactor() {
    const sign = this.current();
    if (sign?.type !== "minus" && sign?.type !== "plus") return this.parseAtom();
    this.consume();
    if (!this.current() || this.current().type === "close" || this.current().type === "multiply" ||
        this.current().type === "divide") {
      throw new Error(`A ${sign.value} sign needs an expression after it.`);
    }
    const operand = this.parseSignedFactor();
    if (sign.type === "plus") return operand;
    // A typed minus directly before a number makes a negative number, so -3
    // is one Number. Anything else gets an explicit Negate node.
    return operand.type === "Number" && !isNegative(operand.value)
      ? createNumber(negate(operand.value)) : createNegate(operand);
  }

  /** The recursion happens when an opening bracket is encountered. */
  parseAtom() {
    const token = this.current();
    if (!token) throw new Error("The expression ended before a term was complete.");
    if (token.type === "divide") {
      throw new Error(`A division needs something to divide: write 1${token.value}… instead of starting with “${token.value}”.`);
    }
    if (token.type === "number") {
      this.consume();
      // Read the typed digits exactly: "0.1" is exactly one tenth.
      try { return createNumber(token.value); }
      catch (error) {
        throw new Error(error.name === "NumberTooLargeError" ? error.message : `Invalid number “${token.value}”.`);
      }
    }
    if (token.type === "identifier") {
      this.consume();
      return createSymbol(token.value);
    }
    if (token.type === "open") {
      this.consume();
      if (!this.current()) {
        const closing = GROUP_BRACKETS[token.style][1];
        throw new Error(`Missing “${closing}” to close “${token.value}” at position ${token.position + 1}.`);
      }
      if (this.current().type === "close") {
        if (this.current().value === GROUP_BRACKETS[token.style][1]) {
          throw new Error(`Empty bracket pair “${token.value}${this.current().value}” is not an expression.`);
        }
        throw new Error(`Expected “${GROUP_BRACKETS[token.style][1]}” but found “${this.current().value}”.`);
      }
      const inside = this.parseSum();
      const closing = this.current();
      const expected = GROUP_BRACKETS[token.style][1];
      if (!closing) throw new Error(`Missing “${expected}” to close “${token.value}” at position ${token.position + 1}.`);
      if (closing.type !== "close" || closing.value !== expected) {
        throw new Error(`Expected “${expected}” to close “${token.value}” at position ${token.position + 1}, but found “${closing.value}”.`);
      }
      this.consume();
      return createGroup(inside, token.style);
    }
    if (token.type === "close") {
      throw new Error(`Unexpected closing bracket “${token.value}” at position ${token.position + 1}.`);
    }
    throw new Error(`Expected a number, variable or opening bracket, but found “${token.value}”.`);
  }
}

export function parseExpression(input) {
  const source = String(input);
  // Preserve the existing parser's precise bracket errors for ordinary sums.
  if (!source.includes("=")) return normaliseWithRules(new ExpressionParser(tokenize(source)).parseRoot());
  // Equality is a top-level statement separator, not an arithmetic token.
  // Bracket depth is tracked explicitly so nested '=' gets a useful error.
  const stack = [];
  const openings = { "(": ")", "[": "]", "{": "}" };
  const closings = new Set(Object.values(openings));
  let separator = -1;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (openings[ch]) stack.push(openings[ch]);
    else if (closings.has(ch)) {
      if (stack.pop() !== ch) throw new Error(`Mismatched closing bracket at position ${i + 1}.`);
    } else if (ch === "=") {
      if (stack.length) throw new Error("An equality cannot appear inside arithmetic brackets.");
      if (separator >= 0) throw new Error("Only one equality sign is supported; chained equality is deferred.");
      separator = i;
    }
  }
  if (stack.length) throw new Error("An opening bracket is missing its closing bracket.");
  const parseSide = text => normaliseWithRules(new ExpressionParser(tokenize(text)).parseRoot());
  if (separator < 0) return parseSide(source);
  if (!source.slice(0, separator).trim() || !source.slice(separator + 1).trim())
    throw new Error("An equality sign needs an expression on both sides.");
  return createEqual(parseSide(source.slice(0, separator)), parseSide(source.slice(separator + 1)));
}

/**
 * Print an expression back into EDITABLE syntax, or into a short history label.
 * Parent/child precedence is checked centrally (operatorMetadata.js). This
 * prevents loss of meaning when a future rewrite creates Add inside Multiply
 * WITHOUT an explicit Group node. Example: Multiply(Add(a,b),c) prints (a+b)c.
 */
function serialize(node, mode = "input", parent = null, operandIndex = null) {
  const print = (child, index) => serialize(child, mode, node, index);
  let content;
  switch (node.type) {
    case "Equal": content = `${serialize(node.left, mode)}${mode === "input" ? "=" : " = "}${serialize(node.right, mode)}`; break;
    case "Number": content = formatExact(node.value); break;
    case "Symbol": content = mode === "input" && !/^[\p{L}]$/u.test(node.name)
      ? `_${node.name}` : node.name; break;
    case "Negate": content = `${mode === "input" ? "-" : "−"}${print(node.operand, "operand")}`; break;
    // The ÷ belongs to the Invert (like the − of a Negate), so it prints here,
    // and the product prints no × before it.
    case "Invert": content = `${mode === "input" ? "/" : "÷"}${print(node.operand, "operand")}`; break;
    case "Group": {
      const [left, right] = GROUP_BRACKETS[node.bracketStyle];
      content = `${left}${print(node.operand, "operand")}${right}`;
      break;
    }
    case "Add": content = node.operands.map(print).join(mode === "input" ? "+" : " + "); break;
    case "Multiply": {
      // A signed factor must not print as juxtaposition: `a -c` means subtraction.
      const dot = mode === "input" ? "·" : " · ";
      const separator = index => node.displayStyle === "times" ? (mode === "input" ? "×" : " × ")
        : node.displayStyle === "dot" || needsVisibleMultiplicationSign(node, index) ? dot
          : " ";
      content = node.operands.map((child, index) =>
        (index > 0 && child.type !== "Invert" ? separator(index) : "") + print(child, index)).join("");
      break;
    }
    case "Apply": content = `${node.operator}(${node.arguments.map(print).join(", ")})`; break;
    default: throw new TypeError(`Cannot serialise expression node ${node.type}.`);
  }
  return needsAutomaticBrackets(parent, node, operandIndex) ? `(${content})` : content;
}

export function expressionToInput(node) { return serialize(node, "input"); }
export function expressionToDisplayString(node) { return serialize(node, "display"); }

