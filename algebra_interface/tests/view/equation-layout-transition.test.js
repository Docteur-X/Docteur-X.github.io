import test from 'node:test';
import assert from 'node:assert/strict';
import { createEquationLayoutTransition } from '../../js/view/equationLayoutTransition.js';

function element(id, left, top, kind = 'add-operand') {
  return { dataset: { nodeId: id }, kind, style: { transition: '', transform: '' },
    matches: selector => selector.includes(kind),
    getBoundingClientRect: () => ({ left, top }) };
}
function fixture(before, after, reduced = false) {
  let current = before;
  const frames = [];
  const root = { querySelectorAll: selector => current.filter(e =>
    selector === '[data-node-id]' || e.kind === 'add-operand' || e.kind === 'factor-slot') };
  const transition = createEquationLayoutTransition({ root,
    prefersReducedMotion: () => reduced,
    requestFrame: callback => frames.push(callback) });
  return { transition, frames, mount: () => { current = after; } };
}

test('5D surviving occurrences animate from old to new view coordinates', () => {
  const old = element('node-a', 10, 20);
  const next = element('node-a', 50, 30);
  const f = fixture([old], [next]);
  const captured = f.transition.capture(); f.mount(); f.transition.animate(captured);
  assert.equal(next.style.transform, 'translate(-40px, -10px)');
  assert.equal(next.style.transition, 'none');
  assert.equal(f.frames.length, 1);
  f.frames[0]();
  assert.equal(next.style.transform, '');
  assert.equal(next.style.transition, '');
});

test('5D reduced motion and disabled animation do not schedule frames', () => {
  for (const reduced of [false, true]) {
    const f = fixture([element('x', 0, 0)], [element('x', 100, 0)], reduced);
    const captured = f.transition.capture(!reduced ? false : true);
    f.mount(); f.transition.animate(captured);
    assert.equal(f.frames.length, 0);
  }
});

test('5D newly created occurrences and subpixel shifts do not animate', () => {
  const a = element('a', 0, 0);
  const next = element('a', 0.5, 0.5);
  const created = element('new', 100, 100);
  const f = fixture([a], [next, created]);
  const captured = f.transition.capture(); f.mount(); f.transition.animate(captured);
  assert.equal(f.frames.length, 0);
});

test('5D old geometry cannot animate a different occurrence identity', () => {
  const next = element('b', 50, 0);
  const f = fixture([element('a', 0, 0)], [next]);
  const captured = f.transition.capture(); f.mount(); f.transition.animate(captured);
  assert.equal(next.style.transform, '');
  assert.equal(f.frames.length, 0);
});
