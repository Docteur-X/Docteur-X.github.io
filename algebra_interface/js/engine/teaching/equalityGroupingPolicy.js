/**
 * Optional grouping of an operand introduced by equality function application.
 *
 * Mathematical validity is NOT decided here. This pure teaching policy only
 * chooses whether a compound operand should retain an explicit, removable
 * Group boundary. Mandatory precedence parentheses remain the responsibility
 * of operatorMetadata/renderer, regardless of the chosen teaching policy.
 *
 * Keep this policy independent of browser state and DOM so future teachers can
 * choose presentation conventions without changing mathematical rules.
 */
export const DEFAULT_EQUALITY_GROUPING_POLICY = 'group-compound';
const EQUALITY_GROUPING_POLICIES = Object.freeze(['group-compound', 'minimal']);

export function shouldGroupIntroducedOperand(operand, policy = DEFAULT_EQUALITY_GROUPING_POLICY) {
  if (!EQUALITY_GROUPING_POLICIES.includes(policy)) {
    throw new RangeError(`Unknown equality grouping policy: ${policy}`);
  }
  // An existing explicit Group already carries its own boundary.
  if (operand?.type === 'Group' || policy === 'minimal') return false;
  // A multi-term sum or product is one new mathematical operand. Preserve
  // that boundary for students; never wrap an atom or a single-child wrapper.
  return (operand?.type === 'Add' || operand?.type === 'Multiply') &&
    operand.operands.length > 1;
}
