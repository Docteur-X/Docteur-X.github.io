/**
 * Function: ln, the natural logarithm. Typed \ln(x), brackets always (owner
 * decision, 12 November 2026); stored as Apply { operator: 'ln', arguments: [x] }.
 * It is not linear, so distribution never applies to it; its identities are
 * identity rules written as data (stage E4).
 */
import { defineOperator } from '../../define.js';

export const operator = defineOperator({
  id: 'ln',
  kind: 'function',
  appliedAs: 'Apply',
  arity: 1,
  signature: ['scalar', 'scalar'],
  properties: [],
  domain: 'positive',
  notation: { function: { name: 'ln' } },
});
