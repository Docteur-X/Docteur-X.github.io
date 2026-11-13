/**
 * Function: tan, the tangent. Typed \tan(x), brackets always (owner
 * decision, 12 November 2026); stored as Apply { operator: 'tan', arguments: [x] }.
 * It is not linear, so distribution never applies to it; its identities are
 * identity rules written as data (stage E4).
 */
import { defineOperator } from '../../define.js';

export const operator = defineOperator({
  id: 'tan',
  kind: 'function',
  appliedAs: 'Apply',
  arity: 1,
  signature: ['scalar', 'scalar'],
  properties: ['odd'],
  periodic: 'π',
  notation: { function: { name: 'tan' } },
});
