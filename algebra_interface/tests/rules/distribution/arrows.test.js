import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDistributionCurves } from '../../../js/rules/distribution/arrows.js';

function element(rect = {}) {
  return {
    children: [], attrs: {}, classList: { values: [], add(name) { this.values.push(name); } },
    dataset: {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 80, ...rect }),
    setAttribute(name, value) { this.attrs[name] = value; },
    append(...children) { this.children.push(...children); },
    remove() { this.removed = true; }
  };
}
function fixture() {
  const source = element({ left: 10, top: 30, width: 20, height: 20 });
  source.dataset.nodeId = 'factor';
  const copy1 = element({ left: 50, top: 55, width: 20, height: 20 });
  const copy2 = element({ left: 90, top: 55, width: 20, height: 20 });
  const old = element();
  const appended = [];
  const equation = {
    querySelector: () => old,
    querySelectorAll(selector) { return selector === '[data-node-id]' ? [source] : [copy1, copy2]; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 120 }),
    append(node) { appended.push(node); }
  };
  const document = { createElementNS: () => element() };
  return { equation, document, old, appended };
}

test('clears stale distribution arrows when no preview is active', () => {
  const f = fixture();
  renderDistributionCurves({ ...f, preview: null });
  assert.equal(f.old.removed, true);
  assert.equal(f.appended.length, 0);
});

test('paints two inert curves for two rendered factor copies', () => {
  const f = fixture();
  renderDistributionCurves({ ...f, preview: { sourceFactorId: 'factor' } });
  assert.equal(f.old.removed, true);
  assert.equal(f.appended.length, 1);
  const svg = f.appended[0];
  assert.deepEqual(svg.classList.values, ['distribution-connections']);
  assert.equal(svg.attrs['aria-hidden'], 'true');
  assert.equal(svg.children.filter(child => child.attrs['marker-end']).length, 2);
});

test('does not draw arrows when the source factor is not rendered', () => {
  const f = fixture();
  renderDistributionCurves({ ...f, preview: { sourceFactorId: 'missing' } });
  assert.equal(f.appended.length, 0);
});
