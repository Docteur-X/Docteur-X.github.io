import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrdinaryDragRuleAdapters } from '../../../js/view/drag/ordinaryDragRuleAdapters.js';
import { validateOrdinaryDragTarget } from '../../../js/view/drag/ordinaryDragEligibility.js';

// Since stage 4 every drop-target kind (combine, insert, negation-compress,
// distribution) is owned by a rule bundle: the adapters pass it to
// `validateRuleTarget(kind, { drag, target })`, which asks that rule.
const drag = { parentId: 'p', parentType: 'Add', item: { id: 'a' } };
function setup(target) {
  const seen = [];
  const rules = createOrdinaryDragRuleAdapters({
    drag, target, getRoot: () => ({}),
    validateRuleTarget: (kind, context) => { seen.push([kind, context.drag, context.target]); return true; }
  });
  return { rules, seen };
}
test('every target kind is validated by the rule that owns it', () => {
  for (const kind of ['combine', 'distribution', 'negation-compress', 'insert']) {
    const target = { kind, id: 'b' };
    const { rules, seen } = setup(target);
    assert.equal(validateOrdinaryDragTarget({ target, rules }), true);
    assert.deepEqual(seen, [[kind, drag, target]]);
  }
});
test('a missing or throwing rule validator fails closed', () => {
  const none = createOrdinaryDragRuleAdapters({ drag, target: { kind: 'insert' }, getRoot: () => ({}) });
  assert.equal(validateOrdinaryDragTarget({ target: { kind: 'insert' }, rules: none }), false);
  const throwing = createOrdinaryDragRuleAdapters({ drag, target: { kind: 'insert' }, getRoot: () => ({}),
    validateRuleTarget: () => { throw Error('stale'); } });
  assert.equal(validateOrdinaryDragTarget({ target: { kind: 'insert' }, rules: throwing }), false);
});
test('a non-true answer does not count as eligible', () => {
  const rules = createOrdinaryDragRuleAdapters({ drag, target: { kind: 'combine' }, getRoot: () => ({}),
    validateRuleTarget: () => 1 });
  assert.equal(validateOrdinaryDragTarget({ target: { kind: 'combine' }, rules }), false);
});
