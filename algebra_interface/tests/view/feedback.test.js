/** Phase 1: regression fixtures for overlapping view-scoped feedback owners. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisualFeedbackController } from '../../js/view/visualFeedbackController.js';

function element() {
  const classes = new Set();
  return { dataset: {}, classList: {
    add(value) { classes.add(value); }, remove(value) { classes.delete(value); },
    contains(value) { return classes.has(value); },
  } };
}
function fixture() {
  const a = element(), b = element();
  const attached = new Set([a, b]);
  const root = { contains: value => attached.has(value) };
  return { a, b, attached, root };
}

test('same role survives clearing either owner, including across controller handles', () => {
  const { root, a } = fixture();
  const one = createVisualFeedbackController(root), two = createVisualFeedbackController(root);
  one.show('shared-name', [{ element: a, role: 'eligible' }]);
  two.show('shared-name', [{ element: a, role: 'eligible' }]);
  one.clear('shared-name');
  assert.equal(a.classList.contains('math-feedback--eligible'), true);
  two.clear('shared-name');
  assert.equal(a.classList.contains('math-feedback--eligible'), false);
  one.dispose(); two.dispose();
});

test('replacing one owner preserves other roles, navigation focus, and hints', () => {
  const { root, a, b } = fixture();
  a.dataset.mathFeedbackHint = 'original annotation';
  const eligibility = createVisualFeedbackController(root);
  const navigation = createVisualFeedbackController(root);
  eligibility.show('green', [{ element: a, role: 'eligible', hint: 'Can negate' }]);
  navigation.show('focus', [{ element: a, role: 'structure-navigation' }]);
  eligibility.show('green', [{ element: b, role: 'selected' }]);
  assert.equal(a.classList.contains('is-structure-navigated'), true);
  assert.equal(a.classList.contains('math-feedback--eligible'), false);
  assert.equal(a.dataset.mathFeedbackHint, 'original annotation');
  navigation.dispose();
  assert.equal(a.classList.contains('is-structure-navigated'), false);
  assert.equal(b.classList.contains('math-feedback--selected'), true);
  eligibility.dispose();
});

test('overlapping hints restore the surviving owner then original annotation', () => {
  const { root, a } = fixture();
  a.dataset.mathFeedbackHint = 'original';
  const one = createVisualFeedbackController(root), two = createVisualFeedbackController(root);
  one.show('a', [{ element: a, role: 'eligible', hint: 'first' }]);
  two.show('b', [{ element: a, role: 'eligible', hint: 'second' }]);
  assert.equal(a.dataset.mathFeedbackHint, 'second');
  two.clear('b');
  assert.equal(a.dataset.mathFeedbackHint, 'first');
  one.clear('a');
  assert.equal(a.dataset.mathFeedbackHint, 'original');
  one.dispose(); two.dispose();
});

test('invalid updates are atomic and detached nodes are cleaned on reconciliation', () => {
  const { root, a, b, attached } = fixture();
  const feedback = createVisualFeedbackController(root);
  feedback.show('gesture', [{ element: a, role: 'eligible' }]);
  assert.throws(() => feedback.show('gesture', [{ element: b, role: 'invalid' }]), TypeError);
  assert.equal(a.classList.contains('math-feedback--eligible'), true);
  attached.delete(a);
  feedback.show('other', [{ element: b, role: 'selected' }]);
  assert.equal(a.classList.contains('math-feedback--eligible'), false);
  feedback.dispose();
});

test('independent mathematical views never share ownership', () => {
  const a = element();
  const root1 = { contains: x => x === a }, root2 = { contains: () => false };
  const first = createVisualFeedbackController(root1), second = createVisualFeedbackController(root2);
  first.show('owner', [{ element: a, role: 'eligible' }]);
  assert.throws(() => second.show('owner', [{ element: a, role: 'eligible' }]), TypeError);
  second.dispose();
  assert.equal(a.classList.contains('math-feedback--eligible'), true);
  first.dispose();
});
