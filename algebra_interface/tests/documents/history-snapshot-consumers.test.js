/**
 * Contract tests for consumers of recorded history snapshots.
 *
 * A recorded snapshot is an authoritative historical value. Replay, event-only
 * export, and restoration preparation must not give a caller mutable aliases
 * into that value. These tests intentionally use nested substitution data:
 * shallow copying would pass with ordinary numeric substitutions.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDocumentHistory, appendHistoryState, replayHistoryState,
  exportEventHistory, hydrateHistorySnapshots, verifyHistoryReplay
} from '../../js/documents/documentHistory.js';
import { detachHistorySnapshot } from '../../js/documents/historySnapshotBoundary.js';
import { parseExpression } from '../helpers/legacyRootParser.js';

function recordedHistory() {
  const history = createDocumentHistory();
  const source = {
    expression: parseExpression('a+b'),
    substitutions: { a: { exact: { numerator: 1, denominator: 3 } } }
  };
  const node = appendHistoryState(history, source, { actionLabel: 'Initial', kind: 'construction' });
  return { history, source, node };
}

test('history recording and replay detach nested values from both caller and record', () => {
  const { history, source, node } = recordedHistory();
  source.substitutions.a.exact.numerator = 99;
  assert.equal(node.snapshot.substitutions.a.exact.numerator, 1);
  const replay = replayHistoryState(history, node.id);
  replay.substitutions.a.exact.numerator = 42;
  replay.expression.id = 'modified-replay';
  assert.equal(node.snapshot.substitutions.a.exact.numerator, 1);
  assert.notEqual(node.snapshot.expression.id, 'modified-replay');
  assert.equal(verifyHistoryReplay(history), true);
});

test('event-only export and hydration cannot mutate live recorded history', () => {
  const { history, node } = recordedHistory();
  const exported = exportEventHistory(history);
  assert.equal(Object.hasOwn(exported.nodes[0], 'snapshot'), false);
  const hydrated = hydrateHistorySnapshots(exported);
  hydrated.nodes[0].snapshot.substitutions.a.exact.denominator = 9;
  hydrated.nodes[0].event.patch[0].value.substitutions.a.exact.numerator = 8;
  assert.equal(node.snapshot.substitutions.a.exact.denominator, 3);
  assert.equal(node.event.patch[0].value.substitutions.a.exact.numerator, 1);
  assert.equal(verifyHistoryReplay(history), true);
});

test('preparing multiple editable restorations leaves history snapshots untouched', () => {
  const { history, node } = recordedHistory();
  const first = detachHistorySnapshot(node.snapshot.expression, node.snapshot.substitutions);
  const second = detachHistorySnapshot(node.snapshot.expression, node.snapshot.substitutions);
  first.substitutions.a.exact.numerator = 10;
  first.expression.id = 'working-id';
  assert.equal(second.substitutions.a.exact.numerator, 1);
  assert.equal(node.snapshot.substitutions.a.exact.numerator, 1);
  assert.notEqual(second.expression.id, 'working-id');
  assert.equal(verifyHistoryReplay(history), true);
});
