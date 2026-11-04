/* Regression tests for presentation-only hitbox visibility. Real-browser
 * testing is still needed for nested CSS, drag previews and pointer capture. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHitboxVisibility } from '../js/interaction/hitboxVisibility.js';

function box(parent = null, classes = ['term']) {
  const items = new Set(classes);
  const el = {
    parent,
    classList: {
      add: (name) => items.add(name),
      remove: (name) => items.delete(name),
      contains: (name) => items.has(name)
    },
    closest(selector) {
      if (selector !== '.term[data-node-id]') return null;
      return this.classList.contains('term') ? this : parent?.closest(selector) ?? null;
    }
  };
  return el;
}

test('only deepest hovered hitbox is decorated; selected ancestors are untouched', () => {
  const root = box(null, []);
  root.contains = (item) => { for (let n = item; n; n = n.parent) if (n === root) return true; return false; };
  const group = box(root, ['term', 'is-selected']);
  const add = box(group);
  const number = box(add);
  const host = { dataset: {} };
  const controller = createHitboxVisibility(root, host);
  controller.setMode('hover');
  controller.updateFromTarget(number);
  assert.equal(number.classList.contains('is-hitbox-hovered'), true);
  assert.equal(add.classList.contains('is-hitbox-hovered'), false);
  assert.equal(group.classList.contains('is-hitbox-hovered'), false);
  assert.equal(group.classList.contains('is-selected'), true);
  controller.updateFromTarget(add);
  assert.equal(number.classList.contains('is-hitbox-hovered'), false);
  assert.equal(add.classList.contains('is-hitbox-hovered'), true);
  assert.equal(group.classList.contains('is-selected'), true);
});

test('multiple selection survives hover changes, leaving equation and mode switches', () => {
  const root = box(null, []);
  root.contains = (item) => { for (let n = item; n; n = n.parent) if (n === root) return true; return false; };
  const a = box(root, ['term', 'is-multi-selected']);
  const b = box(root, ['term', 'is-multi-selected']);
  const c = box(root);
  const controller = createHitboxVisibility(root, { dataset: {} });
  controller.setMode('hover');
  controller.updateFromTarget(c);
  assert.equal(c.classList.contains('is-hitbox-hovered'), true);
  assert.equal(a.classList.contains('is-multi-selected'), true);
  assert.equal(b.classList.contains('is-multi-selected'), true);
  controller.updateFromTarget(null);
  assert.equal(c.classList.contains('is-hitbox-hovered'), false);
  controller.updateFromTarget(c);
  controller.setMode('visible');
  assert.equal(c.classList.contains('is-hitbox-hovered'), false);
  assert.equal(a.classList.contains('is-multi-selected'), true);
});

test('preview and drag suppression do not remove selection or alter hitbox layout', () => {
  const root = box(null, []);
  root.contains = (item) => item.parent === root;
  const selected = box(root, ['term', 'is-selected']);
  const target = box(root, ['term', 'is-combine-target']);
  const controller = createHitboxVisibility(root, { dataset: {} });
  controller.setMode('hover');
  controller.updateFromTarget(target, false);
  assert.equal(target.classList.contains('is-combine-target'), true);
  assert.equal(target.classList.contains('is-hitbox-hovered'), false);
  assert.equal(selected.classList.contains('is-selected'), true);
  assert.equal(controller.setMode('invalid'), 'visible');
});
