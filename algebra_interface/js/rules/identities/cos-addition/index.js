/**
 * Identity: the cosine of a sum (stage E4b), written as data.
 *   cos(a + b) = cos(a)·cos(b) − sin(a)·sin(b)
 */
import { defineIdentity } from '../../../definitions/define.js';

export const identity = defineIdentity({
  id: 'cos.addition',
  label: 'cos(a + b) = cos(a)·cos(b) − sin(a)·sin(b)',
  lhs: '\\cos(a+b)',
  rhs: '\\cos(a)\\cos(b)-\\sin(a)\\sin(b)',
  variables: ['a', 'b'],
  directions: ['expand', 'collapse'],
  interaction: 'activate',
});
