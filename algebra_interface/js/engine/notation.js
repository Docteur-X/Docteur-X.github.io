/* ========================================================================== *
 * Notation table: every written sign, as data (Engine stages E2, E3)
 * ========================================================================== *
 * Design: Developer Documentation/06_Historical_Records/Superseded_2026-11-12/Engine_Standard_Design_Draft.md (decisions: 00_Current/Decisions.md)
 *
 * The parser and printer (parser.js) read this table; neither names a sign.
 * Since E3 the rows live in the definitions they belong to, and this module
 * only ASSEMBLES them: an operator's `notation` (js/definitions/operators/<id>/index.js)
 * and a relation's (js/relations/<id>/index.js). Adding notation is adding a
 * row to a definition. The five notation styles of the design:
 *
 *   infix     a + b, a × b, a ÷ b      levels: one node type per level,
 *                                       ordered by the operator's precedence
 *   prefix    −a, +a                   signs written before a factor
 *   postfix   n!, Aᵀ                   (none yet)
 *   outfix    (a), [a], {a}            brackets around one expression
 *   function  sin(x)                   (printed; read in a later stage)
 * and relations (=), which join two whole sides of a statement.
 *
 * An infix level builds ONE node type from its operands. An operator in a
 * level may turn the operand after it into another node first: − gives
 * Negate (a − b is Add(a, Negate(b))), ÷ gives Invert (a ÷ b is
 * Multiply(a, Invert(b))). Juxtaposition (2x, a b) is part of the product's
 * level, with its own rules.
 *
 * Numbers, names and function application are not operators, so their print
 * rows are here.
 * ========================================================================== */
import { formatExact } from './rational.js';
import { OPERATORS } from '../definitions/operators/operators.js';
import { RELATIONS } from '../definitions/relations/relations.js';

const withNotation = (registry, part) => registry.list.filter(definition => definition.notation?.[part]);

/** Infix levels, lowest precedence first: { node, precedence, operators, … }. */
export const INFIX_LEVELS = Object.freeze(withNotation(OPERATORS, 'infix')
  .map(operator => Object.freeze({ node: operator.node, precedence: operator.precedence, ...operator.notation.infix }))
  .sort((a, b) => a.precedence - b.precedence));

/** Signs written before a factor. `apply` builds the node from the factor after it. */
export const PREFIX_OPERATORS = Object.freeze(withNotation(OPERATORS, 'prefix').flatMap(operator => operator.notation.prefix));

/** Brackets: explicit Group nodes that keep their own style. */
export const OUTFIX = Object.freeze(withNotation(OPERATORS, 'outfix').flatMap(operator => operator.notation.outfix));

/** Relations join the two sides of a whole statement. */
export const RELATION_ROWS = Object.freeze(withNotation(RELATIONS, 'relation')
  .map(relation => Object.freeze({ node: relation.node, ...relation.notation.relation })));

/**
 * Functions (stage E4): typed with a backslash and brackets, \sin(x) (owner
 * decision). Keyed by name; each row builds Apply { operator, arguments }.
 */
export const FUNCTIONS = Object.freeze(new Map(withNotation(OPERATORS, 'function')
  .map(operator => [operator.notation.function.name, Object.freeze({ id: operator.id, arity: operator.arity })])));
export const FUNCTION_SIGN = '\\';

/** Characters kept for notation not built yet. */
// < and > were reserved until they became relations (stage E4c): a sign a
// relation uses is never reserved.
export const RESERVED = Object.freeze({ chars: [...'|<>'].filter(char => !RELATION_ROWS.some(row => row.signs.includes(char))).join(''),
  message: char => `“${char}” is reserved for a future operation; use (), [] or {} for grouping.` });

/**
 * How each node type is printed. `mode` is 'input' (editable text, which the
 * parser reads back) or 'display' (history labels). Automatic brackets are
 * added by the printer from operatorMetadata.js, not here.
 */
export const PRINT = Object.freeze(Object.fromEntries([
  ['Number', { style: 'leaf', text: node => formatExact(node.value) }],
  // In editable text a name longer than one letter is written _name, so that
  // "ab" (one symbol) and "a b" (a product) read back as they were.
  ['Symbol', { style: 'leaf', text: (node, mode) => mode === 'input' && !/^[\p{L}]$/u.test(node.name)
    ? `_${node.name}` : node.name }],
  // Editable text writes the backslash (\sin(x)), so it reads back; history labels do not.
  ['Apply', { style: 'function', name: (node, mode) => mode === 'input' ? `${FUNCTION_SIGN}${node.operator}` : node.operator, separator: ', ' }],
  ...[...withNotation(OPERATORS, 'print'), ...withNotation(RELATIONS, 'print')]
    .map(definition => [definition.node, definition.notation.print]),
]));
