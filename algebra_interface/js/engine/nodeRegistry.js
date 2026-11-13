/* ========================================================================== *
 * Node registry: the one description of every AST node type (Engine stage E1)
 * ========================================================================== *
 * Design: Developer Documentation/06_Historical_Records/Superseded_2026-11-12/Engine_Standard_Design_Draft.md (decisions: 00_Current/Decisions.md)
 *
 * Each entry says, as data, what a node of that type holds:
 *   category       'expression' or 'statement' (a relation such as =)
 *   relation       for a statement: which relation it states ('equal')
 *   children       where its child nodes live:
 *                    { kind: 'none' }
 *                    { kind: 'single', key: 'operand' }
 *                    { kind: 'list',   key: 'operands', min: 1 }
 *                    { kind: 'named',  keys: ['left', 'right'] }
 *   meaningFields  non-child fields that are part of the mathematics
 *                  (Symbol.name, Apply.operator); compared by equality and
 *                  written in the canonical text form
 *   notationFields presentation only (Multiply.displayStyle): their allowed
 *                  values and default. Never compared by structural equality.
 *   mathJsonHead   the MathJSON head, when the node maps to one directly
 *
 * Generic code (tree walking, equality, invariants, canonical text, MathJSON)
 * reads this table instead of naming node types. Code that needs to know
 * "is this a relation?" asks isRelationNode(), never `type === 'Equal'`
 * (a test enforces that), so a new relation such as < is one more entry.
 *
 * Stored type names are kept as they were (Equal, not Relation{equal}), so
 * saved documents and their history fingerprints are unchanged; MathJSON also
 * uses separate heads (Equal, Less). FunctionCall, which no input could ever
 * produce, became Apply { operator, arguments }.
 *
 * What a node MEANS (value, which rules apply, notation rows) is not here: that
 * belongs to the operator, type and relation definitions of stages E2-E3.
 * ========================================================================== */
import { isExactNumberInput } from './rational.js';

const SYMBOL_NAME = value => typeof value === 'string' && value.trim() !== '';

export const NODE_TYPES = Object.freeze({
  Number: Object.freeze({
    category: 'expression', children: { kind: 'none' },
    // New documents store an exact string ("0.1"); older ones a finite number.
    meaningFields: { value: v => (typeof v === 'string' || typeof v === 'number') && isExactNumberInput(v) },
  }),
  Symbol: Object.freeze({
    category: 'expression', children: { kind: 'none' },
    meaningFields: { name: SYMBOL_NAME },
  }),
  Add: Object.freeze({
    category: 'expression', children: { kind: 'list', key: 'operands', min: 1 },
    mathJsonHead: 'Add',
  }),
  Multiply: Object.freeze({
    category: 'expression', children: { kind: 'list', key: 'operands', min: 1 },
    notationFields: { displayStyle: { values: ['implicit', 'dot', 'times'], default: 'implicit' } },
    mathJsonHead: 'Multiply',
  }),
  Group: Object.freeze({
    // Explicit brackets: an editing boundary, not an operation (MathJSON omits it).
    // `ownBrackets`: it draws brackets round its child, so no automatic ones are added inside.
    category: 'expression', children: { kind: 'single', key: 'operand' }, ownBrackets: true,
    notationFields: { bracketStyle: { values: ['round', 'square', 'curly'], default: 'round' } },
  }),
  Negate: Object.freeze({
    category: 'expression', children: { kind: 'single', key: 'operand' },
    mathJsonHead: 'Negate',
  }),
  Invert: Object.freeze({
    category: 'expression', children: { kind: 'single', key: 'operand' },
  }),
  Apply: Object.freeze({
    // A function applied to arguments: sin(x), f(x, y). Which functions exist
    // (and what they mean) comes from operator definitions (stage E3).
    category: 'expression', children: { kind: 'list', key: 'arguments', min: 0 }, ownBrackets: true,
    meaningFields: { operator: SYMBOL_NAME },
  }),
  Equal: Object.freeze({
    category: 'statement', relation: 'equal', children: { kind: 'named', keys: ['left', 'right'] },
    mathJsonHead: 'Equal',
  }),
});

const NONE = Object.freeze({});

// Relations beyond = register the node they are stored as (stage E4c), so a
// new relation such as < is one folder in js/relations/ and needs no edit here.
const RELATION_NODES = new Map();
export function registerRelationNode(type, relation, mathJsonHead = type) {
  const existing = nodeTypeInfo(type);
  if (existing) {
    if (existing.relation === relation) return;
    throw new TypeError(`Node type ${type} is already registered.`);
  }
  RELATION_NODES.set(type, Object.freeze({
    category: 'statement', relation, children: Object.freeze({ kind: 'named', keys: Object.freeze(['left', 'right']) }), mathJsonHead,
  }));
}
/** Every node type name: the built-in ones and the registered relations. */
export const allNodeTypes = () => [...Object.keys(NODE_TYPES), ...RELATION_NODES.keys()];

/** The registry entry for a node or a type name; null when unknown. */
export function nodeTypeInfo(nodeOrType) {
  const type = typeof nodeOrType === 'string' ? nodeOrType : nodeOrType?.type;
  return Object.hasOwn(NODE_TYPES, type) ? NODE_TYPES[type] : RELATION_NODES.get(type) ?? null;
}
export const meaningFieldsOf = info => info?.meaningFields ?? NONE;
export const notationFieldsOf = info => info?.notationFields ?? NONE;

export function isExpressionNode(node) { return nodeTypeInfo(node)?.category === 'expression'; }
/** A relation (=, later <, ≤ …): two named sides, `left` and `right`. */
export function isRelationNode(node) { return Boolean(nodeTypeInfo(node)?.relation); }
export function categoryOf(node) { return nodeTypeInfo(node)?.category ?? null; }

/**
 * The node's children as { child, index }, in order. `index` is how the parent
 * holds that child, and is what walkExpression and findNodeLocation report:
 * a number for a list, the key ('operand', 'left', 'right') otherwise.
 */
export function childEntries(node) {
  const shape = nodeTypeInfo(node)?.children;
  switch (shape?.kind) {
    case 'single': return node[shape.key] ? [{ child: node[shape.key], index: shape.key }] : [];
    case 'list': return Array.isArray(node[shape.key])
      ? node[shape.key].map((child, index) => ({ child, index })) : [];
    case 'named': return shape.keys.filter(key => node[key]).map(key => ({ child: node[key], index: key }));
    default: return [];
  }
}
export const childrenOf = node => childEntries(node).map(entry => entry.child);

/** The array that holds a list node's children (operands / arguments), or null. */
function childList(node) {
  const shape = nodeTypeInfo(node)?.children;
  return shape?.kind === 'list' && Array.isArray(node[shape.key]) ? node[shape.key] : null;
}

/**
 * Replace each child with `fn(child, index)`, in place. In a list, a null
 * result removes that child (normalisation relies on this); a single or named
 * slot keeps whatever `fn` returns.
 */
export function mapChildrenInPlace(node, fn) {
  const shape = nodeTypeInfo(node)?.children;
  if (shape?.kind === 'single') { if (node[shape.key]) node[shape.key] = fn(node[shape.key], shape.key); }
  else if (shape?.kind === 'named') for (const key of shape.keys) { if (node[key]) node[key] = fn(node[key], key); }
  else if (shape?.kind === 'list' && Array.isArray(node[shape.key])) {
    node[shape.key] = node[shape.key].map((child, index) => fn(child, index)).filter(Boolean);
  }
  return node;
}

/** Put `replacement` where the parent holds the child at `index`. */
export function replaceChildAt(parent, index, replacement) {
  const shape = nodeTypeInfo(parent)?.children;
  if (!shape || !replacement) return false;
  if (shape.kind === 'single' && index === shape.key && parent[index]) { parent[index] = replacement; return true; }
  if (shape.kind === 'named' && shape.keys.includes(index)) { parent[index] = replacement; return true; }
  const list = childList(parent);
  if (list && Number.isInteger(index) && index >= 0 && index < list.length) { list[index] = replacement; return true; }
  return false;
}
