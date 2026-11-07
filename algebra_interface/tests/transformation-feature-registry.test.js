import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransformationFeatureRegistry } from '../js/manipulator/transformationFeatures.js';
import { createTransformationCoordinator } from '../js/manipulator/transformationCoordinator.js';

const make = (id, overrides = {}) => ({ id, propose: (_root, params) => ({ params }),
  confirmationMode: 'preview', ...overrides });

test('registry discovers capabilities without invoking their Engine rules', () => {
  let calls = 0;
  const registry = createTransformationFeatureRegistry([make('sample', { propose: () => { calls++; return { ok: true }; } })]);
  assert.equal(registry.has('sample'), true);
  assert.equal(registry.get('missing'), null);
  assert.equal(registry.list().length, 1);
  assert.equal(calls, 0);
});

test('registry rejects duplicate or invalid definitions', () => {
  assert.throws(() => createTransformationFeatureRegistry([make('x'), make('x')]), /Duplicate/);
  assert.throws(() => createTransformationFeatureRegistry([make('x', { confirmationMode: 'sometimes' })]), /Invalid/);
  assert.throws(() => createTransformationFeatureRegistry([make('x', { gesture: 4 })]), /gesture/);
});

test('coordinator dispatches registry rules and uses registered visual semantics', () => {
  const visual = candidate => ({ source: candidate.action.ruleId });
  const coordinator = createTransformationCoordinator(createTransformationFeatureRegistry([
    make('sample', { confirmationMode: 'immediate', visual })
  ]));
  const action = { ruleId: 'sample', parameters: { a: 1 } };
  const candidate = coordinator.propose({ id: 'root' }, action);
  assert.equal(candidate.confirmationMode, 'immediate');
  assert.deepEqual(candidate.result.params, { a: 1 });
  assert.deepEqual(coordinator.describe(candidate), { source: 'sample' });
  assert.equal(coordinator.propose({ id: 'root' }, { ruleId: 'unknown' }), null);
});

test('registry definitions are defensive copies and do not mutate input', () => {
  const feature = make('sample');
  const registry = createTransformationFeatureRegistry([feature]);
  feature.confirmationMode = 'immediate';
  assert.equal(registry.get('sample').confirmationMode, 'preview');
  assert.equal(Object.isFrozen(registry.get('sample')), true);
});
