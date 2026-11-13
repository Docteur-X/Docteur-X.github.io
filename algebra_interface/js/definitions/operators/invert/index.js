/**
 * Operator: Invert, the multiplicative inverse. a÷b is Multiply(a, Invert(b)).
 * It is written by the ÷ row of Multiply. The ÷ belongs to the Invert (as the
 * − belongs to a Negate), so a product prints no sign of its own before it.
 * Its operand is bracketed unless it is an atom (operatorMetadata.js).
 */
import { defineOperator } from '../../define.js';

export const operator = defineOperator({
  id: 'Invert',
  node: 'Invert',
  arity: 1,
  inverseOf: 'Multiply',
  precedence: 30,
  notation: {
    print: { style: 'prefix', sign: mode => mode === 'input' ? '/' : '÷', attachesInside: 'Multiply' },
  },
});
