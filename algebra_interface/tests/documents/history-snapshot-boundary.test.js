import test from 'node:test';
import assert from 'node:assert/strict';
import { detachHistorySnapshot } from '../../js/documents/historySnapshotBoundary.js';
import { parseExpression } from '../helpers/legacyRootParser.js';

test('history snapshot detaches nested substitutions in both directions', () => {
  const root = parseExpression('a+b');
  const substitutions = { a: { value: { numerator: 2, denominator: 3 } } };
  const detached = detachHistorySnapshot(root, substitutions);
  const originalId = root.id;
  detached.expression.id = 'working-change';
  detached.substitutions.a.value.numerator = 99;
  assert.equal(root.id, originalId);
  assert.equal(substitutions.a.value.numerator, 2);
  substitutions.a.value.denominator = 17;
  assert.equal(detached.substitutions.a.value.denominator, 3);
});

test('restoring the same history snapshot twice yields independent working state', () => {
  const recorded = detachHistorySnapshot(parseExpression('x+y'), { x: { value: 5 } });
  const first = detachHistorySnapshot(recorded.expression, recorded.substitutions);
  const second = detachHistorySnapshot(recorded.expression, recorded.substitutions);
  first.substitutions.x.value = 99;
  first.expression.id = 'changed';
  assert.equal(second.substitutions.x.value, 5);
  assert.equal(second.expression.id, recorded.expression.id);
  assert.equal(recorded.substitutions.x.value, 5);
});

test('history snapshot rejects malformed substitutions before publication', () => {
  assert.throws(() => detachHistorySnapshot(null, []), /substitutions/);
  assert.throws(() => detachHistorySnapshot(null, null), /substitutions/);
  assert.deepEqual(detachHistorySnapshot(null), { expression: null, substitutions: {} });
});
