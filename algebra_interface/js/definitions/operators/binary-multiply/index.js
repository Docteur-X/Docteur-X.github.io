/**
 * Operator: BinaryMultiply, the axiom: exactly two factors. Multiply is
 * defined from it. Defined, not stored yet (as BinaryAdd).
 */
import { defineOperator } from '../../define.js';

export const operator = defineOperator({ id: 'BinaryMultiply', arity: 2, axiom: true });
