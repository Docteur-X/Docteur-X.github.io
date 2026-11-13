/**
 * Operator: Add, addition as people think of it (owner naming): many terms,
 * grouping irrelevant. Defined as BinaryAdd applied from left to right, and
 * stored as one node with a list of terms ("defined as, not stored as").
 * It exists where + is associative; without that, a written chain stays
 * left-nested, never silently regrouped.
 *
 * Notation: the infix level of + and −. Subtraction is adding the additive
 * inverse: a − b is Add(a, Negate(b)), and the Negate stays explicit (a
 * manipulable occurrence with its own minus). A leading + changes nothing.
 */
import { defineOperator } from '../../define.js';
import { createAdd, createNegate } from '../../../engine/nodeFactory.js';
import { hasProperty } from '../../../engine/structures.js';

const leftNested = operands => operands.slice(1).reduce((acc, next) => createAdd([acc, next]), operands[0]);

export const operator = defineOperator({
  id: 'Add',
  node: 'Add',
  arity: 'many',
  definedAs: { sequentially: 'BinaryAdd', direction: 'left' },
  requires: { BinaryAdd: ['associative'] },
  precedence: 10,
  notation: {
    infix: {
      operators: [
        { signs: ['+'], operand: operand => operand },
        { signs: ['-'], operand: createNegate },
      ],
      missingOperand: sign => `A ${sign} sign needs an expression after it.`,
      build: operands => hasProperty('Add', 'associative') ? createAdd(operands) : leftNested(operands),
    },
    prefix: [{ signs: ['+'], apply: operand => operand,
      missingOperand: sign => `A ${sign} sign needs an expression after it.` }],
    print: { style: 'infix', separator: mode => mode === 'input' ? '+' : ' + ' },
  },
  // How a sum is drawn and handled on screen (stage I1; js/definitions/operators/presentation.js).
  presentation: {
    sequence: { role: 'sum', containerClass: 'add-expression', containerLabel: 'Expression addends',
      termClass: 'add-operand', compoundTermClass: 'add-operand--product', termLabel: 'Addend',
      operatorClass: 'plus', combineLabel: 'Release to add' },
  },
});
