/* Regression: grouping an entire equality side must remain visible immediately.
 * Use a tiny DOM stand-in to test the real renderer without a browser package. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../js/core/parser.js';
import { getRangeGroupingPlan, groupOperandRange } from '../js/operations/grouping.js';
import { renderExpression } from '../js/rendering/domRenderer.js';
import { expressionToInput } from '../js/core/parser.js';

function fakeDocument() {
  return { createElement(tag) {
    const element = {
      tag, children: [], dataset: {}, attributes: {}, className: '', textContent: '',
      classList: { add(...names) { element.className += ' ' + names.join(' '); } },
      append(...children) { element.children.push(...children); },
      setAttribute(name, value) { element.attributes[name] = value; }
    };
    return element;
  } };
}
function descendants(node) { return [node, ...node.children.flatMap(descendants)]; }

for (const side of ['left', 'right']) {
  test(`grouping all immediate addends under Equal.${side} displays explicit brackets`, () => {
    const root = parseExpression('a+b+c=d+e+f');
    const add = root[side];
    const ids = add.operands.map(node => node.id);
    assert.equal(getRangeGroupingPlan(root, ids).wholeParent, true);
    const result = groupOperandRange(root, ids, 'round');
    assert.ok(result);
    assert.equal(root[side].type, 'Group');
    assert.equal(root[side].operand.id, add.id);
    assert.deepEqual(root[side].operand.operands.map(n => n.id), ids);
    const previousDocument = globalThis.document;
    globalThis.document = fakeDocument();
    try {
      const dom = renderExpression(root, { selectedNodeId: result.group.id });
      const sideRoot = dom.children[side === 'left' ? 0 : 2];
      const elements = descendants(sideRoot);
      assert.ok(elements.some(el => el.dataset.nodeId === result.group.id && el.className.includes('is-selected')));
      assert.ok(elements.some(el => el.dataset.parentId === add.id), 'nested operation remains interactive');
      const brackets = elements.filter(el => el.className.includes('expression-bracket')).map(el => el.textContent);
      assert.ok(brackets.includes('(') && brackets.includes(')'), 'explicit brackets are visible');
      assert.match(expressionToInput(root), /\(.*\)/);
    } finally { globalThis.document = previousDocument; }
  });
}

test('non-Add expression roots render without losing their mathematical structure', () => {
  const previousDocument = globalThis.document;
  globalThis.document = fakeDocument();
  try {
    for (const source of ['(a+b)', 'a*b', 'x']) {
      const root = parseExpression(source).operands[0];
      const dom = renderExpression(root);
      assert.equal(dom.className.includes('expression-root'), true);
      assert.ok(descendants(dom).length > 1);
    }
  } finally { globalThis.document = previousDocument; }
});
