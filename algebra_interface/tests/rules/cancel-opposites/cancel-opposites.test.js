// Rule bundle js/rules/cancel-opposites: a term and its opposite in the same
// sum make 0. The Engine and the feature, without a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToInput } from '../../../js/engine/parser.js';
import { cancelOpposites, areOpposites } from '../../../js/rules/cancel-opposites/engine.js';
import { cancelOppositesFeatures, describeCancelOpposites } from '../../../js/rules/cancel-opposites/rule.js';

const cancel = (source, i, j, substitutions) => {
  const root = parseExpression(source);
  const sum = root.type === 'Equal' ? root.left : root;
  const result = cancelOpposites(root, sum.operands[i].id, sum.operands[j].id, substitutions);
  return { root, sum, result, text: result ? expressionToInput(result.root) : null };
};

test('a term and its opposite become one 0, in the place of the first', () => {
  const { root, text } = cancel('a+b+-b', 1, 2);
  assert.equal(text, 'a+0');
  // Either direction of the drag gives the same result.
  assert.equal(cancel('a+b+-b', 2, 1).text, 'a+0');
  // The input is never changed.
  assert.equal(expressionToInput(root), 'a+b+-b');
});

test('a sum of only the pair becomes 0; equation sides work too', () => {
  assert.equal(cancel('b+-b', 0, 1).text, '0');
  assert.equal(cancel('a+b+-b=c', 1, 2).text, 'a+0=c');
});

test('brackets and product notation do not stop a match', () => {
  assert.equal(cancel('2x+-(2x)+y', 0, 1).text, '0+y');
  assert.equal(cancel('(a+b)+c+-(a+b)', 0, 2).text, '0+c');
  const product = parseExpression('2x').operands ? parseExpression('2x') : null;
  const dotted = { ...structuredClone(product), displayStyle: 'dot' };
  assert.ok(areOpposites(product, { id: 'n', type: 'Negate', operand: dotted }));
});

test('refuses terms that are not opposites, and numeric pairs (numeric combination adds those)', () => {
  assert.equal(cancel('a+b', 0, 1).text, null);
  assert.equal(cancel('3+-3', 0, 1).text, null);
  assert.equal(cancel('b+-b', 0, 1, { b: '2' }).text, null);
});

test('the feature and its wording', () => {
  const root = parseExpression('a+b+-b');
  const [, b, minusB] = root.operands;
  const [feature] = cancelOppositesFeatures;
  assert.equal(feature.confirmationMode, 'immediate');
  assert.ok(feature.propose(root, { sourceId: b.id, targetId: minusB.id }));
  assert.equal(describeCancelOpposites(root, b.id, minusB.id).hint, 'b + −b = 0');
});
