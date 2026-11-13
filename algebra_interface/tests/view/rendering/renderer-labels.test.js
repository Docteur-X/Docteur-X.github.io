/**
 * Renderer standard, the label promise: every occurrence and every operator
 * in the input tree can be found by the renderer's labels.
 *   occurrence  data-hitbox-role="occurrence" + data-node-id
 *   operator    data-hitbox-role="operator"   + data-operator-owner-id
 * Run on the REAL renderer for every node type the parser produces.
 *
 * R1 (stage 5, done): a sum or product NESTED inside a Group or Negate has
 * its own occurrence box. So does a sum or product that is a whole side of an
 * equation (done 12 November 2026 (an invisible `.equation-side`
 * box). Only the root itself has no box.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../../../js/engine/parser.js';
import { renderExpression } from '../../../js/view/rendering/domRenderer.js';
import { withFakeDocument, allElements } from '../../helpers/fakeDom.js';

const EXPRESSIONS = ['a', '3', '-a', 'a+b', '2x', '2(x+3)', '-(a+b)', 'a+-b', '(a)', '((x))',
  'a=b', '2x+3=y', '(a+b)(c+d)', 'a(b+c)+d', '-(2x)', '(-3)', 'x*(y*(z+1))',
  // Division (Invert): the ÷ is the Invert's operator, drawn inside its box.
  'a÷b×c', 'a÷(b+c)', '6÷(2x)', 'x=1÷b', 'a÷b÷c'];

function* walk(node, parent = null) {
  yield { node, parent };
  for (const child of node.operands ?? []) yield* walk(child, node);
  if (node.operand) yield* walk(node.operand, node);
  if (node.left) { yield* walk(node.left, node); yield* walk(node.right, node); }
}
const operatorCount = node =>
  node.type === 'Add' ? node.operands.length - 1 :
  node.type === 'Negate' || node.type === 'Invert' || node.type === 'Equal' ? 1 : 0;

// R1 is complete (12 November 2026): every sum and product below the root,
// including a whole side of an equation, has its own occurrence box.
const isKnownR1Gap = () => false;

for (const source of EXPRESSIONS) {
  test(`label promise: ${source}`, async () => {
    const root = parseExpression(source);
    const elements = await withFakeDocument(() => allElements(renderExpression(root)));
    const occurrenceIds = new Set(elements.filter(e => e.dataset.hitboxRole === 'occurrence').map(e => e.dataset.nodeId));
    const contentIds = new Set(elements.filter(e => e.dataset.hitboxRole === 'content').map(e => e.dataset.parentId));
    const operatorOwners = elements.filter(e => e.dataset.hitboxRole === 'operator').map(e => e.dataset.operatorOwnerId);
    for (const entry of walk(root)) {
      const { node } = entry;
      const isRootOperation = node === root && ['Add', 'Multiply', 'Equal'].includes(node.type);
      if (isRootOperation || isKnownR1Gap(entry)) {
        // Still findable: its interior carries its ID.
        assert.ok(contentIds.has(node.id), `${source}: ${node.type} ${node.id} has no content label`);
      } else {
        assert.ok(occurrenceIds.has(node.id), `${source}: ${node.type} ${node.id} has no occurrence box`);
      }
      const expected = operatorCount(node);
      if (expected) {
        assert.equal(operatorOwners.filter(id => id === node.id).length, expected,
          `${source}: ${node.type} ${node.id} should have ${expected} labelled operator(s)`);
      }
    }
  });
}

// Renderer standard rule 4: the renderer paints no state. Selection is a
// decoration added afterwards, by label.
test('the renderer paints no selection; markSelectedOccurrence adds it by label', async () => {
  const { markSelectedOccurrence } = await import('../../../js/view/selectionDecoration.js');
  const root = parseExpression('2(x+3)');
  const x = [...walk(root)].find(({ node }) => node.name === 'x').node;
  await withFakeDocument(() => {
    const tree = renderExpression(root, { selectedNodeId: x.id });
    assert.equal(allElements(tree).filter(e => e.classList.contains('is-selected')).length, 0);
    assert.equal(markSelectedOccurrence(tree, x.id), 1);
    const selected = allElements(tree).filter(e => e.classList.contains('is-selected'));
    assert.deepEqual(selected.map(e => e.dataset.nodeId), [x.id]);
  });
});

// Renderer standard rule 7: the renderer says what a part IS; what it DOES is
// added afterwards from the rules' gesture declarations. The words stay
// exactly as before stage 5.
test('action wording comes from the declarations and reads as before', async () => {
  const { applyActionWording } = await import('../../../js/view/actionWording.js');
  const { GESTURE_DECLARATIONS } = await import('../../../js/app/gestureDeclarations.js');
  const labels = source => withFakeDocument(() => {
    const root = parseExpression(source);
    const tree = renderExpression(root);
    const byId = new Map([...walk(root)].map(({ node }) => [node.id, node]));
    applyActionWording(tree, { declarations: GESTURE_DECLARATIONS, findNode: id => byId.get(id) ?? null });
    return allElements(tree).filter(e => e.attributes['aria-label'] && (e.dataset.nodeId || e.dataset.operatorOwnerId))
      .map(e => [e.attributes['aria-label'], e.title || '']);
  });
  const sum = await labels('a+b');
  assert.deepEqual(sum.map(([label]) => label), ['Addend: a. Arrows reorder; click selects.', 'Addend: b. Arrows reorder; click selects.']);
  const product = await labels('2x');
  assert.deepEqual(product.map(([label]) => label), ['Factor: 2. Arrows reorder; click selects.', 'Factor: x. Arrows reorder; click selects.']);
  const negation = await labels('-(a+b)');
  assert.ok(negation.some(([label]) => label === 'Expression: negative expression. Click selects.'));
  assert.ok(negation.some(([label, title]) => label === 'Expand negation as multiplication by negative one' && title === 'Click to expose −1'));
  // The renderer alone says only what each part is.
  const bare = await withFakeDocument(() => allElements(renderExpression(parseExpression('a+b')))
    .map(e => e.attributes['aria-label']).filter(Boolean));
  assert.ok(bare.includes('Addend: a') && !bare.some(label => /click selects|Arrows/i.test(label)));
});
