/**
 * Consolidation Phase 0: characterize CURRENT contracts before changing them.
 * These tests deliberately avoid browser layout and application mutations.
 * Overlapping-owner feedback is recorded as a known risk, not codified as
 * desired behavior; Phase 1 must first add a failing regression for that case.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../../js/engine/parser.js';
import { mapMathematicalOccurrences, mapRenderedOccurrences } from '../../js/view/rendering/semanticContainerMap.js';
import { navigateStructure } from '../../js/view/structureNavigation.js';
import { createVisualFeedbackController } from '../../js/view/visualFeedbackController.js';

function fakeElement(dataset = {}) {
  const classes = new Set();
  return {
    dataset,
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
  };
}

test('phase 0: natural-root AST navigation retains nested Group and Number ancestry', () => {
  const entries = mapMathematicalOccurrences(parseExpression('(((30)))'));
  assert.deepEqual(entries.map(({ type }) => type), ['Group', 'Group', 'Group', 'Number']);
  for (let i = 1; i < entries.length; i++) {
    assert.equal(entries[i].parentId, entries[i - 1].nodeId);
    assert.equal(navigateStructure(entries, entries[i].nodeId, 'parent'), entries[i - 1].nodeId);
  }
});

test('phase 0: content-only operations remain addressable without invented hitboxes', () => {
  const entries = mapMathematicalOccurrences(parseExpression('a+b'));
  const add = entries[0];
  const child = entries[1];
  const content = fakeElement({ parentId: add.nodeId, hitboxRole: 'content' });
  const occurrence = fakeElement({ nodeId: child.nodeId, hitboxRole: 'occurrence' });
  const view = {
    querySelectorAll(selector) {
      if (selector === '[data-node-id]') return [occurrence];
      if (selector === '[data-operator-owner-id]') return [];
      if (selector === '[data-parent-id]') return [content];
      throw new Error(`Unexpected selector: ${selector}`);
    },
  };
  const mapped = mapRenderedOccurrences(entries, view);
  assert.equal(mapped[0].representation, 'content-only');
  assert.equal(mapped[0].directlyTargetable, false);
  assert.equal(mapped[1].representation, 'occurrence');
  assert.equal(mapped[1].directlyTargetable, true);
});

test('phase 0: one feedback owner can show, replace and clear semantic eligibility without changing geometry', () => {
  const element = fakeElement();
  const root = { contains: candidate => candidate === element };
  const feedback = createVisualFeedbackController(root);
  feedback.show('phase0', [{ element, role: 'eligible', hint: 'Release to negate' }]);
  assert.equal(element.classList.contains('math-feedback--eligible'), true);
  assert.equal(element.dataset.mathFeedbackHint, 'Release to negate');
  assert.throws(() => feedback.show('phase0', [{ element, role: 'invalid' }]), TypeError);
  assert.equal(element.classList.contains('math-feedback--eligible'), true);
  feedback.show('phase0', [{ element, role: 'selected' }]);
  assert.equal(element.classList.contains('math-feedback--eligible'), false);
  assert.equal(element.classList.contains('math-feedback--selected'), true);
  feedback.dispose();
  assert.equal(element.classList.contains('math-feedback--selected'), false);
});
