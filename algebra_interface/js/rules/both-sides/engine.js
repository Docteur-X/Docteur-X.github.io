/**
 * Add the opposite of a term to both sides of a relation (pure Engine code):
 * an equation, or an inequality (stage E4c: adding keeps < and > too).
 *
 *   a + b = c   with term b   →   a + b + −b = c + −b
 *
 * This is what "moving a term across the equals sign" really is: the same
 * thing (the term's opposite) is added to both sides, so the equation stays
 * true. Cancelling b + −b is a separate step (owner, 12 November 2026), so
 * every step stays visible in history.
 *
 * The term must be a whole side, or a term of a side that is a sum. A sum
 * side gets the new term appended (it stays one flat sum, so every term can
 * still be dragged on its own); any other side becomes a new two-term sum.
 * Existing node IDs are kept; the two new occurrences get fresh IDs.
 * No DOM, no state: inputs are never changed.
 */
import { createAdd, createNegate, createNumber, cloneExpression, copyWithFreshIds } from '../../engine/nodeFactory.js';
import { isScalarExpression } from '../../engine/nodeCategories.js';
import { isRelationNode } from '../../engine/nodeRegistry.js';

/** The opposite of a term, written the way a student would write it. */
export function oppositeOf(term) {
  // −(−u) is u; a negative number's opposite is the positive number.
  if (term.type === 'Negate') return cloneExpression(term.operand);
  if (term.type === 'Number' && String(term.value).startsWith('-')) return createNumber(String(term.value).slice(1));
  return createNegate(cloneExpression(term));
}

const freshOccurrence = copyWithFreshIds;

/** Which side holds the term: 'left' or 'right', or null when it is not a side term. */
export function sideOfTerm(equal, termId) {
  for (const side of ['left', 'right']) {
    const expression = equal?.[side];
    if (!expression) continue;
    if (expression.id === termId) return side;
    if (expression.type === 'Add' && expression.operands.some(operand => operand.id === termId)) return side;
  }
  return null;
}

export function addOppositeToBothSides(equal, termId) {
  if (!isRelationNode(equal)) return null;
  const side = sideOfTerm(equal, termId);
  if (!side) return null;
  const sideExpression = equal[side];
  const term = sideExpression.id === termId ? sideExpression : sideExpression.operands.find(o => o.id === termId);
  // Like equality's own rule: this version certifies scalar expressions only.
  if (![equal.left, equal.right, term].every(isScalarExpression)) return null;

  const opposite = oppositeOf(term);
  const root = cloneExpression(equal);
  const insertedNodeIds = [];
  for (const key of ['left', 'right']) {
    const copy = freshOccurrence(opposite);
    insertedNodeIds.push(copy.id);
    if (root[key].type === 'Add') root[key].operands.push(copy);
    else root[key] = createAdd([root[key], copy]);
  }
  return {
    root,
    insertedNodeIds,
    affectedNodeIds: [termId],
    opposite: cloneExpression(opposite),
    provenance: {
      rule: 'equality.add-opposite', ruleVersion: 1,
      relationId: equal.id, termId, fromSide: side,
      implication: 'equivalence' // adding a scalar to both sides is reversible
    }
  };
}
