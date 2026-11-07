/**
 * Equality function application: a=b implies F(a)=F(b).
 *
 * This module is pure mathematical Engine code. It knows nothing about DOM,
 * clipboard libraries, pointer gestures or windows. A one-hole function context
 * is described structurally, never by parsing a string such as "x+c".
 *
 * V1 supports scalar addition and ordered multiplication. The distinction
 * between left/right multiplication is intentionally retained even when the
 * current scalar domain happens to be commutative: future matrix multiplication
 * must not silently reverse factors. An application is a FORWARD implication;
 * it is not automatically an equivalence of solution sets (e.g. multiply by 0).
 */
import { createAdd, createMultiply, createGroup, cloneExpression, createNodeId } from '../core/nodeFactory.js';
import { isScalarExpression } from '../core/nodeCategories.js';
import { walkExpression } from '../core/treeUtils.js';
import { shouldGroupIntroducedOperand, DEFAULT_EQUALITY_GROUPING_POLICY } from '../teaching/equalityGroupingPolicy.js';

export const EQUALITY_CONTEXTS = Object.freeze(['add-right', 'multiply-left', 'multiply-right']);

/** Clone an operand into a new occurrence, never borrowing clipboard node IDs. */
function freshOccurrence(node) {
  const result = cloneExpression(node);
  walkExpression(result, part => { part.id = createNodeId(); });
  return result;
}

/**
 * Apply one function context without touching the original argument.
 * The teaching policy may add a genuine Group to the COPIED operand only.
 * The renderer supplies any mandatory precedence parentheses around the
 * original argument (e.g. (a+b)c), independently of that policy.
 */
function applyContext(argument, operand, context, groupingPolicy) {
  const copy = freshOccurrence(operand);
  // The parser sometimes represents a lone explicit Group in a one-child Add.
  // Reuse that Group rather than manufacturing redundant double parentheses.
  const normalized = copy.type === 'Add' && copy.operands.length === 1 &&
    ['Group', 'Multiply'].includes(copy.operands[0].type)
    ? copy.operands[0] : copy;
  const inserted = shouldGroupIntroducedOperand(normalized, groupingPolicy)
    ? createGroup(normalized) : normalized;
  if (context === 'add-right') return createAdd([argument, inserted]);
  if (context === 'multiply-left') return createMultiply([inserted, argument]);
  if (context === 'multiply-right') return createMultiply([argument, inserted]);
  throw new TypeError('Unsupported equality function context.');
}

/**
 * Return a new equality tree and provenance, leaving all inputs untouched.
 * Existing equality and side node IDs are preserved. New context nodes and
 * the two copies of the operand receive distinct IDs.
 *
 * Eligibility is deliberately conservative: current type inference only
 * certifies scalar expressions. Domain-sensitive division, arbitrary functions,
 * inequalities and matrix shape rules must be introduced separately.
 */
export function applyFunctionToEquality(equal, operand, context, options = {}) {
  const groupingPolicy = options.groupingPolicy ?? DEFAULT_EQUALITY_GROUPING_POLICY;
  if (equal?.type !== 'Equal') throw new TypeError('Function application requires an equality.');
  if (!EQUALITY_CONTEXTS.includes(context)) throw new TypeError('Unsupported function context.');
  if (!isScalarExpression(equal.left) || !isScalarExpression(equal.right) || !isScalarExpression(operand))
    throw new TypeError('This version requires scalar expressions on both sides and in the operand.');

  const result = cloneExpression(equal);
  result.left = applyContext(result.left, operand, context, groupingPolicy);
  result.right = applyContext(result.right, operand, context, groupingPolicy);
  // The outer copied occurrence is the Group when a compound sum is added.
  // Expose IDs as semantic data so the renderer never has to infer preview
  // meaning from operand positions or from visible text.
  const insertedOperandIds = [result.left, result.right].map(side =>
    context === 'multiply-left' ? side.operands[0].id : side.operands.at(-1).id);
  return {
    root: result,
    visualRoles: { insertedOperandIds },
    provenance: {
      rule: 'equality.apply-function', ruleVersion: 1,
      relationId: equal.id, context, groupingPolicy,
      operandSnapshot: cloneExpression(operand),
      implication: 'forward',
      // We do not claim reversibility for multiplication by an unknown/zero operand.
      equivalence: context === 'add-right' ? 'scalar-addition-reversible' : 'not-established'
    }
  };
}
