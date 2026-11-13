/**
 * Operator: SequentiallyApply (owner naming). Any binary operator written in a
 * row without brackets, a + b + c, meaning it is applied in a fixed direction:
 * left to right by default, right to left where the operator declares it
 * (powers: a^b^c is a^(b^c)). An operator with no agreed reading opts out, so
 * a×b×c for vectors is refused with "write the brackets" (owner decisions).
 * One definition serves every binary operator.
 *
 * Defined, not stored yet: the parser builds left-nested nodes for a
 * non-associative operation today; this node arrives with the first type
 * that needs it.
 */
import { defineOperator } from '../../define.js';

export const operator = defineOperator({
  id: 'SequentiallyApply',
  arity: 'many',
  appliesTo: 'any binary operator',
  directions: ['left', 'right'],
  defaultDirection: 'left',
});
