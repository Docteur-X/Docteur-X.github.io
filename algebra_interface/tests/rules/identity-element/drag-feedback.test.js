import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdentityDragFeedback, describeIdentityTarget } from '../../../js/rules/identity-element/dragFeedback.js';

test('identity hover hints describe left/right wrapping and associative gaps', () => {
  assert.match(describeIdentityTarget({ operation:'Add', targetNodeId:'a', side:'left' }), /\+0 on the left/);
  assert.match(describeIdentityTarget({ operation:'Multiply', targetNodeId:'b', side:'right' }), /×1 on the right/);
  assert.match(describeIdentityTarget({ operation:'Add', parentNodeId:'sum', insertionIndex:1 }), /between operands/);
  assert.match(describeIdentityTarget(null), /No valid/);
});

test('floating identity and hover glow are independent and clean up completely', () => {
  const oldDocument = globalThis.document;
  function classes() {
    const names = new Set();
    return { add: n=>names.add(n), remove:n=>names.delete(n), contains:n=>names.has(n) };
  }
  const children = [];
  globalThis.document = {
    createElement: () => ({ classList:classes(), style:{}, setAttribute(){}, remove(){ this.removed=true; } }),
    body: { append(node){ children.push(node); } }
  };
  try {
    const toolbar = { classList:classes() };
    const first = { classList:classes() };
    const second = { classList:classes() };
    const feedback = createIdentityDragFeedback(toolbar, { contains: () => true });
    feedback.start('Add', 10, 20);
    assert.equal(children[0].textContent, '+0');
    assert.equal(children[0].style.left, '26px');
    assert.equal(children[0].style.top, '36px');
    feedback.highlight(first);
    assert.equal(first.classList.contains('math-feedback--proposed-target'), true);
    feedback.move(30, 40);
    feedback.highlight(second);
    assert.equal(first.classList.contains('math-feedback--proposed-target'), false);
    assert.equal(second.classList.contains('math-feedback--proposed-target'), true);
    feedback.stop();
    assert.equal(second.classList.contains('math-feedback--proposed-target'), false);
    assert.equal(children[0].removed, true);
    assert.equal(toolbar.classList.contains('identity-toolbar--dragging'), false);
    feedback.start('Multiply', 0, 0);
    assert.equal(children[1].textContent, '×1');
    feedback.stop();
  } finally { globalThis.document = oldDocument; }
});
