/**
 * Doing the same to both sides of a relation: a=b implies F(a)=F(b); a<b
 * implies a+c < b+c; multiplying a<b depends on the sign of the factor.
 *
 * Which operations a relation allows, and what they do to it, come from the
 * relation's definition (js/definitions/relations/<id>/, `bothSides`):
 * 'same' keeps it, 'converse' flips it (< becomes >), { bySign } depends on
 * the sign of the operand (positive, zero, negative), { refuse } forbids it.
 * A number's sign is known. An expression's sign is not: then the result asks
 * for it ({ needsSign: true }), the student answers (owner decision, 12
 * November 2026: ask the student), and the answer is recorded as the step's
 * assumption, like b ≠ 0. (Later: statements that split into cases.)
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
import { createAdd, createMultiply, createGroup, cloneExpression, copyWithFreshIds } from '../nodeFactory.js';
import { isScalarExpression } from '../nodeCategories.js';
import { shouldGroupIntroducedOperand, DEFAULT_EQUALITY_GROUPING_POLICY } from '../teaching/equalityGroupingPolicy.js';
import { isRelationNode } from '../nodeRegistry.js';
import { evaluateNumericNode } from '../treeUtils.js';
import { isNegative, isZero } from '../rational.js';
import { expressionToDisplayString } from '../parser.js';
import { RELATIONS, relationForNode } from '../../definitions/relations/relations.js';

const SIGNS = Object.freeze(['positive', 'zero', 'negative']);
const SIGN_TEXT = Object.freeze({ positive: '> 0', zero: '= 0', negative: '< 0' });

/** The sign of an operand when it is a known number; null when it is not known. */
export function knownSign(operand) {
  let value = null;
  try { value = evaluateNumericNode(operand); } catch { value = null; }
  if (value === null) return null;
  return isZero(value) ? 'zero' : isNegative(value) ? 'negative' : 'positive';
}

/** The node type a relation becomes under an effect ('same', 'converse', 'equal'). */
function resultType(relation, effect) {
  if (effect === 'same') return relation.node;
  if (effect === 'converse') return RELATIONS.get(relation.converse)?.node ?? null;
  if (effect === 'equal') return RELATIONS.get('equal').node;
  return null;
}

const EQUALITY_CONTEXTS = Object.freeze(['add-right', 'multiply-left', 'multiply-right']);

// A new occurrence of the operand, never borrowing clipboard node IDs.
const freshOccurrence = copyWithFreshIds;

/**
 * Apply one function context without touching the original argument.
 * The teaching policy may add a genuine Group to the COPIED operand only.
 * The renderer supplies any mandatory precedence parentheses around the
 * original argument (e.g. (a+b)c), independently of that policy.
 */
function applyContext(argument, operand, context, groupingPolicy) {
  const copy = freshOccurrence(operand);
  // Saved-document compatibility: older documents may contain a one-child Add.
  // Reuse its child rather than manufacturing redundant double parentheses.
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
 * Return a new statement tree and provenance, leaving all inputs untouched.
 * Existing relation and side node IDs are preserved. New context nodes and
 * the two copies of the operand receive distinct IDs.
 *
 * `options.sign` ('positive', 'zero', 'negative') is the student's answer when
 * the operand's sign matters and is not known; without it such a request
 * returns { needsSign: true, … } instead of a tree.
 *
 * Eligibility is deliberately conservative: current type inference only
 * certifies scalar expressions. Division, arbitrary functions and matrix
 * shape rules must be introduced separately.
 */
export function applyFunctionToEquality(equal, operand, context, options = {}) {
  const groupingPolicy = options.groupingPolicy ?? DEFAULT_EQUALITY_GROUPING_POLICY;
  const relation = isRelationNode(equal) ? relationForNode(equal) : null;
  if (!relation) throw new TypeError('Function application requires a relation.');
  if (!EQUALITY_CONTEXTS.includes(context)) throw new TypeError('Unsupported function context.');
  if (!isScalarExpression(equal.left) || !isScalarExpression(equal.right) || !isScalarExpression(operand))
    throw new TypeError('This version requires scalar expressions on both sides and in the operand.');

  // What the relation says this operation does to it.
  const operation = context === 'add-right' ? 'add' : 'multiply';
  const effect = relation.bothSides?.[operation];
  if (!effect || effect.refuse) throw new TypeError(effect?.refuse ?? `${relation.id} does not allow this on both sides.`);
  let outcome = effect;
  let assumptions = [];
  if (effect.bySign) {
    const known = knownSign(operand);
    const sign = known ?? options.sign;
    if (!SIGNS.includes(sign)) {
      return { needsSign: true, relationId: equal.id, relation: relation.id,
        operandText: expressionToDisplayString(operand), effects: { ...effect.bySign } };
    }
    outcome = effect.bySign[sign];
    if (!known) {
      assumptions = [{ kind: 'sign', text: `${expressionToDisplayString(operand)} ${SIGN_TEXT[sign]}`,
        expression: cloneExpression(operand), sign }];
    }
  }
  const type = resultType(relation, outcome);
  if (!type) throw new TypeError(`${relation.id}: unknown both-sides effect ${outcome}.`);

  const result = cloneExpression(equal);
  result.type = type;
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
    insertedNodeIds: insertedOperandIds,
    ...(assumptions.length ? { assumptions } : {}),
    // How the relation changed: 'same', 'converse' (flipped) or 'equal'.
    relationChange: outcome,
    provenance: {
      rule: 'equality.apply-function', ruleVersion: 1,
      relationId: equal.id, context, groupingPolicy, fromRelation: relation.id, toType: type,
      operandSnapshot: cloneExpression(operand),
      implication: 'forward',
      // We do not claim reversibility for multiplication by an unknown/zero operand.
      equivalence: context === 'add-right' ? 'scalar-addition-reversible' : 'not-established'
    }
  };
}
