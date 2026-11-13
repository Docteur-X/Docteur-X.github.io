/**
 * Operator: BinaryAdd, the axiom: exactly two operands (owner naming). Nesting
 * is always shown with brackets: (a + b) + c. Add is defined from it.
 *
 * Defined, not stored yet: no node type uses it until a lesson works with the
 * axioms (axiomatic mode) or a type has a + that is not associative.
 */
import { defineOperator } from '../../define.js';

export const operator = defineOperator({ id: 'BinaryAdd', arity: 2, axiom: true });
