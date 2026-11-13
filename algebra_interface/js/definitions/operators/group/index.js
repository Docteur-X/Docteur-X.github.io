/**
 * Brackets: (a), [a], {a}. An explicit Group node, a boundary the student
 * wrote, not an operation: it has no value of its own and no properties.
 * Each bracket style is kept as written.
 */
import { defineOperator } from '../../define.js';
import { createGroup, GROUP_BRACKETS } from '../../../engine/nodeFactory.js';

export const operator = defineOperator({
  id: 'Group',
  node: 'Group',
  arity: 1,
  precedence: 100,
  notation: {
    outfix: Object.entries(GROUP_BRACKETS).map(([style, [open, close]]) =>
      ({ style, open, close, build: inside => createGroup(inside, style) })),
    print: { style: 'outfix', brackets: node => GROUP_BRACKETS[node.bracketStyle] },
  },
});
