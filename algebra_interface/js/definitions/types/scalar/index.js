/**
 * Type: scalar (a real number). Undeclared symbols are scalars, so every
 * current document uses this type only (Engine stage E3).
 *
 * Under + and × the scalars form a FIELD: both operations are associative and
 * commutative, have identities 0 and 1 and inverses (−a; and 1÷a for a ≠ 0),
 * and × distributes over +. Rules ask these properties (js/engine/structures.js);
 * none of them is written into a rule.
 */
import { defineType } from '../../define.js';

export const type = defineType({
  id: 'scalar',
  description: 'a real number',
  operations: {
    Add: { properties: ['associative', 'commutative', 'identity', 'inverses'],
      identity: '0', inverse: 'Negate' },
    Multiply: { properties: ['associative', 'commutative', 'identity', 'inverses', 'distributive'],
      identity: '1', inverse: 'Invert', distributesOver: ['Add'],
      // Division by zero has no value: an inverse needs a nonzero operand
      // (the D3 assumption mechanism records "b ≠ 0" where it is used).
      inverseNeeds: 'nonzero' },
  },
});
