/* Nested hitbox v1 contract: AST occurrences and transient visual feedback
 * must be independent. These tests use the REAL renderer with a minimal DOM
 * stand-in; browser geometry and touch still require Playwright verification. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../js/core/parser.js';
import { renderExpression } from '../js/rendering/domRenderer.js';
import { createVisualFeedbackController } from '../js/interaction/visualFeedbackController.js';

function fakeDOM() {
  return { createElement(tag) {
    const classes = new Set();
    const el = { tag, children: [], dataset: {}, attributes: {}, textContent: '',
      className: '', classList: {
        add(...names) { for (const n of names) classes.add(n); },
        remove(...names) { for (const n of names) classes.delete(n); },
        contains(name) { return classes.has(name) || el.className.split(/\s+/).includes(name); },
      },
      append(...children) { el.children.push(...children); },
      setAttribute(name,value) { el.attributes[name] = value; },
      contains(target) { return all(el).includes(target); },
    };
    return el;
  } };
}
function all(el) { return [el,...el.children.flatMap(all)]; }

test('each nested Group and literal has its own stable occurrence hitbox', () => {
  const originalDocument = globalThis.document;
  globalThis.document = fakeDOM();
  try {
    const root = parseExpression('(((-3)))');
    const rendered = renderExpression(root);
    const occurrences = all(rendered).filter(e => e.dataset.hitboxRole === 'occurrence');
    // Root may be an Add wrapping the three explicit Groups; only compare
    // the chain that represents the source expression itself.
    const groups = all(rendered).filter(e => e.dataset.nodeId && e.classList.contains('nested-occurrence'));
    assert.ok(groups.length >= 2, 'inner Group and Number must not be flattened into the outer hitbox');
    assert.equal(new Set(occurrences.map(e => e.dataset.nodeId)).size, occurrences.length);
    assert.ok(occurrences.some(e => e.dataset.parentId && groups.includes(e)));
    assert.equal(all(rendered).filter(e => e.dataset.hitboxRole === 'content').every(e => !e.dataset.nodeId), true);
  } finally { globalThis.document = originalDocument; }
});

test('semantic feedback is owner-scoped and never edits mathematical nodes', () => {
  const originalDocument = globalThis.document;
  globalThis.document = fakeDOM();
  try {
    const root = parseExpression('(3)');
    const dom = renderExpression(root);
    const targets = all(dom).filter(e => e.dataset.hitboxRole === 'occurrence');
    assert.ok(targets.length >= 2);
    const controller = createVisualFeedbackController(dom);
    const before = JSON.stringify(root);
    controller.show('gesture-A', [{ element: targets[0], role: 'eligible' }]);
    controller.show('gesture-B', [{ element: targets[1], role: 'proposed-insertion' }]);
    controller.clear('gesture-A');
    assert.equal(targets[0].classList.contains('math-feedback--eligible'), false);
    assert.equal(targets[1].classList.contains('math-feedback--proposed-insertion'), true);
    assert.throws(() => controller.show('gesture-B', [{element: targets[0], role:'unrecognized'}]));
    assert.equal(targets[1].classList.contains('math-feedback--proposed-insertion'), true);
    controller.dispose();
    assert.equal(targets[1].classList.contains('math-feedback--proposed-insertion'), false);
    assert.equal(JSON.stringify(root), before);
  } finally { globalThis.document = originalDocument; }
});
