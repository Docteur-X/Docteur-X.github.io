/* ========================================================================== *
 * Text input <-> expression tree (table-driven, Engine stage E2)
 * ========================================================================== *
 * Every sign, its precedence, the node it builds and its error messages are
 * rows of the notation table (notation.js), assembled from the operator and
 * relation definitions (js/definitions/operators/, js/relations/). This module is generic: it names
 * no sign and no operator. Adding notation is adding a row there.
 *
 * GRAMMAR, read from the table (highest precedence at the bottom):
 *
 *   statement := expression (relation expression)?        relation rows (=)
 *   level[i]  := level[i+1] (infix[i] level[i+1] | juxtaposition level[i+1])*
 *                                                         infix levels (+ −, × · ÷)
 *   signed    := prefix* atom                             prefix rows (+ −)
 *   atom      := number | identifier | open level[0] close   outfix rows ( [ {
 *
 * The parser is RECURSIVE DESCENT: each level asks the next one up for its
 * operands, and a bracket asks level[0] again for what is inside it. The call
 * stack remembers which opening bracket waits for its closing one.
 *
 * Brackets (), [], {} are explicit Group nodes keeping their own style.
 * |, < and > are reserved for future notation. An unmatched or mismatched
 * bracket throws an explanatory error for the hint bar.
 *
 * Identifiers: ab is ONE symbol, not a·b; _a _b are two symbols multiplied.
 * a(b+c) means a times (b+c): function calls are read from stage E3.
 *
 * Behaviour is the same as the parser before E2 for every input, error
 * messages included (tests/engine/parser-equivalence.test.js compares the two).
 * ========================================================================== */
import { needsAutomaticBrackets, needsVisibleMultiplicationSign } from "./operatorMetadata.js";
import { createNumber, createSymbol } from "./nodeFactory.js";
import { normaliseWithRules } from "./normalization.js";
import { INFIX_LEVELS, PREFIX_OPERATORS, OUTFIX, RELATION_ROWS, RESERVED, PRINT, FUNCTIONS, FUNCTION_SIGN } from "./notation.js";
import { createApply } from "./nodeFactory.js";

// Lookup tables built once from the notation table.
const INFIX_BY_SIGN = new Map();
INFIX_LEVELS.forEach((level, levelIndex) => level.operators.forEach(operator =>
  operator.signs.forEach(sign => INFIX_BY_SIGN.set(sign, { levelIndex, level, operator }))));
const PREFIX_BY_SIGN = new Map(PREFIX_OPERATORS.flatMap(row => row.signs.map(sign => [sign, row])));
const OPEN = new Map(OUTFIX.map(row => [row.open, row]));
const CLOSE = new Map(OUTFIX.map(row => [row.close, row]));
const RELATION_BY_SIGN = new Map(RELATION_ROWS.flatMap(row => row.signs.map(sign => [sign, row])));

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
    if (OPEN.has(ch)) {
      push("open", ch, { outfix: OPEN.get(ch) });
      index += 1;
    } else if (CLOSE.has(ch)) {
      push("close", ch);
      index += 1;
    } else if (ch === FUNCTION_SIGN) {
      // A defined function: \sin (stage E4, owner decision).
      const name = remaining.slice(1).match(/^[\p{L}]+/u)?.[0];
      if (!name) throw new Error(`A ${FUNCTION_SIGN} starts a function name, such as ${FUNCTION_SIGN}sin(x).`);
      if (!FUNCTIONS.has(name)) {
        const known = [...FUNCTIONS.keys()].map(known => `${FUNCTION_SIGN}${known}`).join(', ');
        throw new Error(`Unknown function “${FUNCTION_SIGN}${name}”. Defined functions: ${known}.`);
      }
      push("function", `${FUNCTION_SIGN}${name}`, { function: FUNCTIONS.get(name), name });
      index += 1 + name.length;
    } else if (INFIX_BY_SIGN.has(ch) || PREFIX_BY_SIGN.has(ch)) {
      push("sign", ch, { infix: INFIX_BY_SIGN.get(ch) ?? null, prefix: PREFIX_BY_SIGN.get(ch) ?? null });
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
      } else if (RESERVED.chars.includes(ch)) {
        throw new Error(RESERVED.message(ch));
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
    const expression = this.parseLevel(0);
    const extra = this.current();
    if (extra) {
      if (extra.type === "close") {
        throw new Error(`Unmatched closing bracket “${extra.value}” at position ${extra.position + 1}.`);
      }
      throw new Error(`Unexpected “${extra.value}” at position ${extra.position + 1}.`);
    }
    return expression;
  }

  /**
   * One infix level of the table: its operands come from the next level up.
   * An operator of this level may turn the operand after it into another node
   * (− gives Negate, ÷ gives Invert); juxtaposition, where a level allows it,
   * adds an operand with no sign at all.
   */
  parseLevel(levelIndex) {
    if (levelIndex === INFIX_LEVELS.length) return this.parseSignedFactor();
    const level = INFIX_LEVELS[levelIndex];
    const operands = [this.parseLevel(levelIndex + 1)];
    let displayStyle = level.displayStyle?.initial;
    let explicitStyleSeen = false;

    while (this.current()) {
      const next = this.current();
      const infix = next.type === "sign" ? next.infix : null;
      if (infix && infix.levelIndex === levelIndex) {
        this.consume();
        // A sign may follow (a*-b is a times -b); parseSignedFactor checks it.
        if (!this.current() || this.current().type === "close") {
          throw new Error((infix.operator.missingOperand ?? level.missingOperand)(next.value));
        }
        operands.push(infix.operator.operand(this.parseLevel(levelIndex + 1)));
        if (infix.operator.displayStyle && !explicitStyleSeen) {
          displayStyle = infix.operator.displayStyle;
          explicitStyleSeen = true;
        }
        continue;
      }
      const juxtaposition = level.juxtaposition;
      if (!juxtaposition || !juxtaposition.startsFactor(next)) break;
      const previous = operands[operands.length - 1];
      const refusal = juxtaposition.refuse(previous, next);
      if (refusal) throw new Error(refusal);
      if (!juxtaposition.multiplies(previous, next)) break;
      operands.push(this.parseLevel(levelIndex + 1));
    }
    // A level with one operand is that operand: no one-child node is made.
    // Group records its own boundary separately.
    return operands.length === 1 ? operands[0] : level.build(operands, displayStyle);
  }

  /** Prefix signs, read recursively: --b is kept as two signs, never simplified. */
  parseSignedFactor() {
    const sign = this.current();
    const prefix = sign?.type === "sign" ? sign.prefix : null;
    if (!prefix) return this.parseAtom();
    this.consume();
    const after = this.current();
    // A sign needs a factor: not the end, a closing bracket or a sign that
    // cannot start one (× or ÷). Another prefix sign is fine (--b).
    if (!after || after.type === "close" || (after.type === "sign" && !after.prefix)) {
      throw new Error(prefix.missingOperand(sign.value));
    }
    return prefix.apply(this.parseSignedFactor());
  }

  /** The recursion happens when an opening bracket is encountered. */
  parseAtom() {
    const token = this.current();
    if (!token) throw new Error("The expression ended before a term was complete.");
    if (token.type === "sign" && token.infix?.operator.cannotStart) {
      throw new Error(token.infix.operator.cannotStart(token.value));
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
    if (token.type === "function") {
      // Brackets always (owner decision): \sin(x), never \sin x.
      this.consume();
      const open = this.current();
      if (!open || open.type !== "open" || open.whitespaceBefore || open.value !== OUTFIX[0].open) {
        throw new Error(`Write the brackets: ${token.value}(…), for example ${token.value}(x).`);
      }
      const argument = this.parseAtom();
      return createApply(token.function.id, [argument.operand]);
    }
    if (token.type === "open") {
      this.consume();
      const { close: expected, build } = token.outfix;
      if (!this.current()) {
        throw new Error(`Missing “${expected}” to close “${token.value}” at position ${token.position + 1}.`);
      }
      if (this.current().type === "close") {
        if (this.current().value === expected) {
          throw new Error(`Empty bracket pair “${token.value}${this.current().value}” is not an expression.`);
        }
        throw new Error(`Expected “${expected}” but found “${this.current().value}”.`);
      }
      const inside = this.parseLevel(0);
      const closing = this.current();
      if (!closing) throw new Error(`Missing “${expected}” to close “${token.value}” at position ${token.position + 1}.`);
      if (closing.type !== "close" || closing.value !== expected) {
        throw new Error(`Expected “${expected}” to close “${token.value}” at position ${token.position + 1}, but found “${closing.value}”.`);
      }
      this.consume();
      return build(inside);
    }
    if (token.type === "close") {
      throw new Error(`Unexpected closing bracket “${token.value}” at position ${token.position + 1}.`);
    }
    throw new Error(`Expected a number, variable or opening bracket, but found “${token.value}”.`);
  }
}

const parseSide = text => normaliseWithRules(new ExpressionParser(tokenize(text)).parseRoot());

export function parseExpression(input) {
  const source = String(input);
  // Without a relation sign, the parser's own precise bracket errors apply.
  if (![...source].some(ch => RELATION_BY_SIGN.has(ch))) return parseSide(source);
  // A relation joins two whole sides; it is not an arithmetic token. Bracket
  // depth is tracked here so a relation sign inside brackets gets a useful error.
  const stack = [];
  let separator = -1;
  let relation = null;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (OPEN.has(ch)) stack.push(OPEN.get(ch).close);
    else if (CLOSE.has(ch)) {
      if (stack.pop() !== ch) throw new Error(`Mismatched closing bracket at position ${i + 1}.`);
    } else if (RELATION_BY_SIGN.has(ch)) {
      const row = RELATION_BY_SIGN.get(ch);
      if (stack.length) throw new Error(row.insideBrackets);
      if (separator >= 0) throw new Error((relation ?? row).chained);
      separator = i;
      relation = row;
    }
  }
  if (stack.length) throw new Error("An opening bracket is missing its closing bracket.");
  if (!source.slice(0, separator).trim() || !source.slice(separator + 1).trim()) throw new Error(relation.missingSide);
  return relation.build(parseSide(source.slice(0, separator)), parseSide(source.slice(separator + 1)));
}

/**
 * Print an expression back into EDITABLE syntax, or into a short history label,
 * from the PRINT rows of the notation table. Parent/child precedence is checked
 * centrally (operatorMetadata.js), so a rewrite that puts Add inside Multiply
 * WITHOUT a Group still prints its brackets: Multiply(Add(a,b),c) is (a+b)c.
 */
function serialize(node, mode = "input", parent = null, operandIndex = null) {
  const print = (child, index) => serialize(child, mode, node, index);
  const row = PRINT[node?.type];
  let content;
  switch (row?.style) {
    case "leaf": content = row.text(node, mode); break;
    // A relation's sides are whole expressions: no brackets from the relation.
    case "relation": content = `${serialize(node.left, mode)}${row.sign(mode)}${serialize(node.right, mode)}`; break;
    case "prefix": content = `${row.sign(mode)}${print(node.operand, "operand")}`; break;
    case "outfix": {
      const [open, close] = row.brackets(node);
      content = `${open}${print(node.operand, "operand")}${close}`;
      break;
    }
    case "infix": content = node.operands.map((child, index) =>
      (index > 0 && PRINT[child.type]?.attachesInside !== node.type
        ? row.separator(mode, node, index, () => needsVisibleMultiplicationSign(node, index)) : "") +
        print(child, index)).join(""); break;
    case "function": content = `${row.name(node, mode)}(${node.arguments.map(print).join(row.separator)})`; break;
    default: throw new TypeError(`Cannot serialise expression node ${node?.type}.`);
  }
  return needsAutomaticBrackets(parent, node, operandIndex) ? `(${content})` : content;
}

export function expressionToInput(node) { return serialize(node, "input"); }
export function expressionToDisplayString(node) { return serialize(node, "display"); }
