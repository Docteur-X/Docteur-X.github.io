/**
 * Function: cos, the cosine. Typed \cos(x), brackets always (owner
 * decision, 12 November 2026); stored as Apply { operator: 'cos', arguments: [x] }.
 * It is not linear, so distribution never applies to it; its identities are
 * identity rules written as data (stage E4).
 */
import { defineOperator } from '../../define.js';

export const operator = defineOperator({
  id: 'cos',
  kind: 'function',
  appliedAs: 'Apply',
  arity: 1,
  signature: ['scalar', 'scalar'],
  properties: ['even'],
  periodic: '2π',
  notation: { function: { name: 'cos' } },
});
