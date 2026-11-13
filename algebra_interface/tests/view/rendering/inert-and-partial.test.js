// Renderer standard rules 5 and 6 (step 8): inert and partial rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../../../js/engine/parser.js';
import { renderExpression } from '../../../js/view/rendering/domRenderer.js';
import { withFakeDocument, allElements } from '../../helpers/fakeDom.js';

test('inert rendering leaves no tab stop but keeps every label', () => withFakeDocument(() => {
  const root = parseExpression('2(x+3)-a');
  const live = allElements(renderExpression(root));
  const inert = allElements(renderExpression(root, { inert: true }));
  assert.ok(live.some(el => el.getAttribute('tabindex') === '0'));
  assert.ok(!inert.some(el => el.getAttribute('tabindex') === '0'));
  const ids = els => els.map(el => el.dataset.nodeId).filter(Boolean);
  assert.deepEqual(ids(inert), ids(live));
}));

test('a sum drawn on its own keeps the brackets it needs inside a product', () => withFakeDocument(() => {
  const sum = parseExpression('x+3');
  const product = { id: 'p', type: 'Multiply', displayStyle: 'implicit',
    operands: [{ id: 'two', type: 'Number', value: '2' }, sum] };
  const brackets = el => allElements(el).filter(e => e.classList?.contains('expression-bracket--automatic')).length;
  assert.equal(brackets(renderExpression(sum)), 0);
  assert.equal(brackets(renderExpression(sum, { context: { parent: product, index: 1 } })), 2);
}));
