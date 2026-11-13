// Stage 7 rule bundle js/rules/both-sides: drag a term across = to add its
// opposite to both sides. The Engine and the feature, without a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToInput } from '../../../js/engine/parser.js';
import { addOppositeToBothSides, oppositeOf, sideOfTerm } from '../../../js/rules/both-sides/engine.js';
import { bothSidesFeatures, describeBothSidesCandidate } from '../../../js/rules/both-sides/rule.js';

const lastLeft = root => root.left.type === 'Add' ? root.left.operands.at(-1) : root.left;

test('adds the opposite of a left-hand term to both sides, keeping each sum flat', () => {
  const root = parseExpression('a+b=c');
  const b = lastLeft(root);
  const result = addOppositeToBothSides(root, b.id);
  assert.equal(expressionToInput(result.root), 'a+b+-b=c+-b');
  // The left sum stays ONE flat sum (a, b, −b), so each term can still be dragged.
  assert.equal(result.root.left.operands.length, 3);
  assert.equal(result.root.left.id, root.left.id);
  assert.equal(result.insertedNodeIds.length, 2);
  assert.notEqual(result.insertedNodeIds[0], result.insertedNodeIds[1]);
  // The input is never changed.
  assert.equal(expressionToInput(root), 'a+b=c');
});

test('the opposite is written the way a student would write it', () => {
  assert.equal(expressionToInput(oppositeOf(parseExpression('-b'))), 'b');
  assert.equal(expressionToInput(oppositeOf(parseExpression('3'))), '-3');
  // A product's opposite is a negated product (the existing notation: −(2x)).
  assert.equal(expressionToInput(oppositeOf(parseExpression('2x'))), '-(2 x)');
  const root = parseExpression('a-b=c');
  assert.equal(expressionToInput(addOppositeToBothSides(root, lastLeft(root).id).root), 'a+-b+b=c+b');
});

test('a term of the right-hand side, and a whole side, work too', () => {
  const root = parseExpression('x=2y+3');
  const three = root.right.operands.at(-1);
  assert.equal(sideOfTerm(root, three.id), 'right');
  assert.equal(expressionToInput(addOppositeToBothSides(root, three.id).root), 'x+-3=2 y+3+-3');
  assert.equal(expressionToInput(addOppositeToBothSides(root, root.left.id).root), 'x+-x=2 y+3+-x');
});

test('refuses a term that is not a side term, and non-equations', () => {
  const root = parseExpression('2(x+3)=y');
  const nested = root.left.operands[1].operand.operands[0]; // x inside the brackets
  assert.equal(addOppositeToBothSides(root, nested.id), null);
  assert.equal(addOppositeToBothSides(parseExpression('a+b'), 'anything'), null);
});

test('the feature checks the relation and words the preview', () => {
  const root = parseExpression('a+3=c');
  const [feature] = bothSidesFeatures;
  assert.equal(feature.propose(root, { relationId: 'other', termId: lastLeft(root).id }), null);
  const result = feature.propose(root, { relationId: root.id, termId: lastLeft(root).id });
  assert.equal(describeBothSidesCandidate({ result }).label, 'Add −3 to both sides');
});
