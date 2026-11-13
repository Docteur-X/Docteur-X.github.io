import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrdinaryDragGhost, positionOrdinaryDragGhost } from '../../../js/view/drag/ordinaryDragVisual.js';

function element() {
  return {
    style: {}, attributes: {}, children: [], className: '',
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    hasAttribute(name) { return Object.hasOwn(this.attributes, name); },
    append(child) { this.children.push(child); },
    querySelectorAll() { return this.descendants || []; },
    cloneNode() { const copy = element(); copy.attributes.tabindex = '0';
      // Focusable parts inside the copy (the shared inert rule walks children).
      copy.descendants = [element(), element()];
      for (const part of copy.descendants) part.attributes.tabindex = '0';
      copy.children = [...copy.descendants]; return copy; },
    getBoundingClientRect() { return { left: 15, top: 20, width: 120, height: 45 }; }
  };
}
function fixture() {
  const body = element();
  return { body, createElement: () => element() };
}
test('ordinary drag ghost clones without moving the renderer hitbox', () => {
  const source = element(), doc = fixture();
  const { ghost, rect } = createOrdinaryDragGhost(source, doc);
  assert.equal(doc.body.children[0], ghost);
  assert.equal(source.children.length, 0);
  assert.equal(rect.width, 120);
  assert.equal(ghost.style.visibility, 'hidden');
});
test('ghost clone cannot intercept pointers or keyboard focus', () => {
  const { ghost } = createOrdinaryDragGhost(element(), fixture());
  const clone = ghost.children[0];
  assert.equal(ghost.style.pointerEvents, 'none');
  assert.equal(clone.attributes['aria-hidden'], 'true');
  assert.equal(clone.attributes.tabindex, undefined);
  assert.ok(clone.descendants.every(child => child.attributes.tabindex === '-1'));
});
test('ghost dimensions remain fixed for compound expressions', () => {
  const { ghost } = createOrdinaryDragGhost(element(), fixture());
  assert.equal(ghost.style.width, '120px');
  assert.equal(ghost.children[0].style.width, '120px');
  assert.equal(ghost.children[0].style.flex, 'none');
});
test('ghost position uses the source-relative pointer offset', () => {
  const { ghost } = createOrdinaryDragGhost(element(), fixture());
  assert.equal(positionOrdinaryDragGhost({ ghost, offsetX: 10, offsetY: 12 }, 50, 80), true);
  assert.equal(ghost.style.transform, 'translate3d(40px, 68px, 0)');
  assert.equal(positionOrdinaryDragGhost(null, 50, 80), false);
});
