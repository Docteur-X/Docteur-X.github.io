/**
 * Relation: <, "is less than" (stage E4c). A strict order: transitive and
 * irreflexive. Its converse is greater: a < b says the same as b > a.
 * Stored as the Less node; one folder, no edit elsewhere (the test of E4c).
 *
 * Doing the same to both sides:
 *   adding anything keeps it;
 *   multiplying depends on the sign (owner decision: when the sign is unknown,
 *   the student is asked, stage E4d): positive keeps it, zero gives an
 *   equality, negative flips it;
 *   dividing or applying a function is refused: neither keeps an order in general.
 */
import { defineRelation } from '../../define.js';
import { relationNodeBuilder } from '../relationNode.js';

export const relation = defineRelation({
  id: 'less',
  node: 'Less',
  converse: 'greater',
  spoken: 'is less than',
  properties: ['transitive', 'irreflexive'],
  bothSides: {
    add: 'same',
    multiply: { bySign: { positive: 'same', zero: 'equal', negative: 'converse' } },
    invert: { refuse: 'dividing does not keep an order in general' },
    apply: { refuse: 'a function need not keep an order' },
  },
  notation: {
    relation: { signs: ['<'], build: relationNodeBuilder('Less', 'An inequality'),
      missingSide: 'An inequality sign needs an expression on both sides.',
      insideBrackets: 'An inequality cannot appear inside arithmetic brackets.',
      chained: 'Only one relation sign is supported; chains such as a < b < c come later.' },
    print: { style: 'relation', sign: mode => mode === 'input' ? '<' : ' < ' },
  },
});
