/* ========================================================================== *
 * Canonical text form of the AST (Engine stage E1)
 * ========================================================================== *
 * One unambiguous way to write any tree, read and written from the node
 * registry alone (nodeRegistry.js), so it needs no change for a new node type:
 *
 *   a÷b          Multiply(a, Invert(b))
 *   2x − 3 = y   Equal(Add(Multiply(2, x), Negate(3)), y)
 *   sin(x)       Apply[operator=sin](x)
 *
 *   Number   its exact value: 3, -3, 0.1, 1/3
 *   Symbol   its name; a name that is not a plain word is quoted: "x y"
 *   other    Head[field=value, …](child, child, …); the [ ] part is left out
 *            when there are no fields to show
 *
 * By default only the MEANING is written (identity rules, tests, design docs).
 * With { notation: true } the presentation fields are written too
 * (Multiply[displayStyle=dot](a, b)), so a tree can be copied exactly.
 * Node IDs are never written: they identify occurrences, not mathematics.
 *
 * fromCanonicalText builds a tree with fresh IDs; missing notation fields take
 * the registry default. It refuses anything the registry would not accept.
 * ========================================================================== */
import { nodeTypeInfo, childEntries, meaningFieldsOf, notationFieldsOf } from './nodeRegistry.js';
import { createNodeId } from './nodeFactory.js';
import { toExactString } from './rational.js';

const WORD = /^[\p{L}][\p{L}\p{N}_]*$/u;
const quoteIfNeeded = text => WORD.test(text) ? text : JSON.stringify(text);

export function toCanonicalText(node, { notation = false } = {}) {
  const write = current => {
    const info = nodeTypeInfo(current);
    if (!info) throw new TypeError(`Canonical text: unknown node type ${current?.type}.`);
    if (current.type === 'Number') return toExactString(current.value);
    if (current.type === 'Symbol') return quoteIfNeeded(current.name);
    const fields = Object.keys(meaningFieldsOf(info))
      .concat(notation ? Object.keys(notationFieldsOf(info)) : [])
      .map(key => `${key}=${quoteIfNeeded(String(current[key]))}`);
    const children = childEntries(current).map(entry => write(entry.child));
    return `${current.type}${fields.length ? `[${fields.join(', ')}]` : ''}(${children.join(', ')})`;
  };
  return write(node);
}

/** Read canonical text back into a tree with fresh node IDs. */
export function fromCanonicalText(text) {
  let at = 0;
  const fail = message => { throw new SyntaxError(`Canonical text, position ${at}: ${message}`); };
  const space = () => { while (/\s/.test(text[at] ?? '')) at += 1; };
  const expect = char => { space(); if (text[at] !== char) fail(`expected "${char}"`); at += 1; };
  const word = () => {
    space();
    if (text[at] === '"') {
      const match = /^"(?:[^"\\]|\\.)*"/.exec(text.slice(at));
      if (!match) fail('unclosed quotation');
      at += match[0].length;
      return JSON.parse(match[0]);
    }
    const match = /^[\p{L}][\p{L}\p{N}_]*/u.exec(text.slice(at));
    if (!match) fail('expected a name');
    at += match[0].length;
    return match[0];
  };

  function node() {
    space();
    const number = /^-?\d+(?:\.\d+)?(?:\/\d+)?/.exec(text.slice(at));
    if (number) { at += number[0].length; return { id: createNodeId(), type: 'Number', value: toExactString(number[0]) }; }
    const quoted = text[at] === '"';
    const name = word();
    space();
    if (quoted || (text[at] !== '(' && text[at] !== '[')) return { id: createNodeId(), type: 'Symbol', name };
    const info = nodeTypeInfo(name);
    if (!info) fail(`unknown node type ${name}`);
    const result = { id: createNodeId(), type: name };
    const meaning = meaningFieldsOf(info), notationFields = notationFieldsOf(info);
    if (text[at] === '[') {
      at += 1;
      do {
        const key = word(); expect('='); const value = word(); space();
        if (Object.hasOwn(meaning, key)) result[key] = value;
        else if (Object.hasOwn(notationFields, key) && notationFields[key].values.includes(value)) result[key] = value;
        else fail(`${name} has no field ${key}=${value}`);
      } while (text[at] === ',' && (at += 1));
      expect(']');
    }
    for (const [key, spec] of Object.entries(notationFields)) result[key] ??= spec.default;
    for (const [key, valid] of Object.entries(meaning)) if (!valid(result[key])) fail(`${name} needs a valid ${key}`);
    expect('(');
    const children = [];
    space();
    if (text[at] !== ')') {
      children.push(node());
      space();
      while (text[at] === ',') { at += 1; children.push(node()); space(); }
    }
    expect(')');
    const shape = info.children;
    if (shape.kind === 'single') {
      if (children.length !== 1) fail(`${name} takes one child`);
      result[shape.key] = children[0];
    } else if (shape.kind === 'named') {
      if (children.length !== shape.keys.length) fail(`${name} takes ${shape.keys.length} children`);
      shape.keys.forEach((key, index) => { result[key] = children[index]; });
    } else if (shape.kind === 'list') {
      if (children.length < shape.min) fail(`${name} needs at least ${shape.min} child`);
      result[shape.key] = children;
    } else if (children.length) fail(`${name} takes no children`);
    return result;
  }

  const result = node();
  space();
  if (at !== text.length) fail('unexpected text after the expression');
  return result;
}
