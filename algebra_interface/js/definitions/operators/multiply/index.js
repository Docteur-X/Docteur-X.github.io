/**
 * Operator: Multiply, multiplication as people think of it: many factors.
 * Defined as BinaryMultiply applied from left to right, stored as a list.
 *
 * Notation: the infix level of ×, · (also * and ⋅) and ÷ (also /). Division
 * is multiplying by the inverse (owner, 12 November 2026): a÷b is
 * Multiply(a, Invert(b)), shown as ÷. The first explicit sign decides how the
 * product is written (displayStyle). Juxtaposition (2x, a b) multiplies, with
 * its rules, and 6÷2x is refused as ambiguous (owner decision).
 */
import { defineOperator } from '../../define.js';
import { createMultiply, createInvert } from '../../../engine/nodeFactory.js';
import { hasProperty } from '../../../engine/structures.js';

const missingFactor = sign => `The multiplication sign “${sign}” needs a factor after it.`;

export const operator = defineOperator({
  id: 'Multiply',
  node: 'Multiply',
  arity: 'many',
  definedAs: { sequentially: 'BinaryMultiply', direction: 'left' },
  requires: { BinaryMultiply: ['associative'] },
  precedence: 20,
  notation: {
    infix: {
      operators: [
        { signs: ['×'], operand: operand => operand, displayStyle: 'times', missingOperand: missingFactor },
        { signs: ['*', '·', '⋅'], operand: operand => operand, displayStyle: 'dot', missingOperand: missingFactor },
        { signs: ['÷', '/'], operand: createInvert,
          missingOperand: sign => `The division sign “${sign}” needs a divisor after it.`,
          cannotStart: sign => `A division needs something to divide: write 1${sign}… instead of starting with “${sign}”.` },
      ],
      displayStyle: { initial: 'implicit' },
      juxtaposition: {
        // Adjacent brackets always multiply: 2(a+b), (a+b)(c+d). A space
        // separates independent factors: "a b" is a·b. A number or a bracket
        // followed by a name (2x, (a+b)c) multiplies. "ab" stays one Symbol.
        // A function (\sin(x)) is delimited by its backslash, so it always
        // multiplies: 2\sin(x), a\cos(x).
        startsFactor: token => ['number', 'identifier', 'open', 'function'].includes(token.type),
        multiplies: (previous, token) => token.type === 'open' || token.type === 'function' || token.whitespaceBefore ||
          (token.type === 'identifier' && (previous.type === 'Number' || previous.type === 'Group')),
        // After a divisor, juxtaposition WITHOUT a space is ambiguous: 6÷2x is
        // 6÷(2x) in some books and (6÷2)x in others, so it is refused (owner,
        // 12 November 2026: a bad notation that hides ambiguity). A space
        // starts a new factor: 6÷2 x is 6÷2×x.
        refuse: (previous, token) => previous.type === 'Invert' && !token.whitespaceBefore
          ? 'A factor written straight after a divisor is ambiguous (6÷2x could mean 6÷(2x) or 6÷2×x): put the divisor in brackets, 6÷(2x), or separate the next factor with × or a space, 6÷2×x or 6÷2 x.'
          : null,
      },
      build: (operands, displayStyle) => hasProperty('Multiply', 'associative') ? createMultiply(operands, displayStyle)
        : operands.slice(1).reduce((acc, next) => createMultiply([acc, next], displayStyle), operands[0]),
    },
    // A signed factor, or one after a division, needs a visible sign: `a -c`
    // would read as subtraction and `6÷2 x` is refused as ambiguous. The
    // printer passes that notation rule in (needsVisibleSign, from
    // operatorMetadata.js), so this definition does not import it.
    print: { style: 'infix', separator: (mode, product, index, needsVisibleSign) =>
      product.displayStyle === 'times' ? (mode === 'input' ? '×' : ' × ')
        : product.displayStyle === 'dot' || needsVisibleSign() ? (mode === 'input' ? '·' : ' · ')
          : ' ' },
  },
  // How a product is drawn and handled on screen (stage I1). `signStyles`: its
  // operator has written forms (×, ·, none), chosen by the notation rules
  // (needsVisibleMultiplicationSign), which the renderer and preview follow.
  presentation: {
    sequence: { role: 'product', containerClass: 'multiply-expression', containerLabel: 'Expression factors',
      termClass: 'factor-slot', termLabel: 'Factor', operatorClass: 'multiply-operator',
      combineLabel: 'Release to multiply', signStyles: ['times', 'dot', 'implicit'] },
  },
});
