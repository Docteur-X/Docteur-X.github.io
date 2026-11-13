/**
 * Identity: the sine of a sum (stage E4b), written as data (owner decision).
 *   sin(a + b) = sin(a)·cos(b) + cos(a)·sin(b)
 * Tap the sin of sin(a+b) to expand it; tap the + of the expanded sum to
 * collapse it back. No code: the engine matches and rebuilds.
 */
import { defineIdentity } from '../../../definitions/define.js';

export const identity = defineIdentity({
  id: 'sin.addition',
  label: 'sin(a + b) = sin(a)·cos(b) + cos(a)·sin(b)',
  lhs: '\\sin(a+b)',
  rhs: '\\sin(a)\\cos(b)+\\cos(a)\\sin(b)',
  variables: ['a', 'b'],
  directions: ['expand', 'collapse'],
  interaction: 'activate',
});
