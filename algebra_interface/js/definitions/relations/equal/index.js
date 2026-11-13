/**
 * Relation: equality, =. An equivalence relation: reflexive, symmetric and
 * transitive (owner, 12 November 2026: a natural chain a = b = c and a
 * BinaryEqual will follow, as Add follows BinaryAdd). Stored as the Equal node.
 *
 * Doing the same to both sides keeps an equality, except dividing by an
 * expression, which assumes it is nonzero (the D3 assumption mechanism).
 * Its notation row (the = sign and its messages) is read by the parser.
 */
import { defineRelation } from '../../define.js';
import { createEqual } from '../../../engine/relations/equality.js';

export const relation = defineRelation({
  id: 'equal',
  node: 'Equal',
  spoken: 'equals',
  properties: ['reflexive', 'symmetric', 'transitive'],
  bothSides: { add: 'same', multiply: 'same', invert: { assumes: 'nonzero' }, apply: 'same' },
  notation: {
    relation: { signs: ['='], build: createEqual,
      missingSide: 'An equality sign needs an expression on both sides.',
      insideBrackets: 'An equality cannot appear inside arithmetic brackets.',
      chained: 'Only one equality sign is supported; chained equality is deferred.' },
    print: { style: 'relation', sign: mode => mode === 'input' ? '=' : ' = ' },
  },
});
