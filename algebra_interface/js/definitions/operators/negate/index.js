/**
 * Operator: Negate, −a, the additive inverse. a − b is Add(a, Negate(b)).
 * A typed minus straight before a number makes a negative Number (−3 is one
 * number); anything else, including −−b, gets an explicit Negate node.
 */
import { defineOperator } from '../../define.js';
import { createNegate, createNumber } from '../../../engine/nodeFactory.js';
import { isNegative, negate } from '../../../engine/rational.js';

export const operator = defineOperator({
  id: 'Negate',
  node: 'Negate',
  arity: 1,
  inverseOf: 'Add',
  precedence: 30,
  notation: {
    prefix: [{ signs: ['-'], missingOperand: sign => `A ${sign} sign needs an expression after it.`,
      apply: operand => operand.type === 'Number' && !isNegative(operand.value)
        ? createNumber(negate(operand.value)) : createNegate(operand) }],
    print: { style: 'prefix', sign: mode => mode === 'input' ? '-' : '−' },
  },
});
