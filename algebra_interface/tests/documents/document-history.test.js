import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDocumentHistory, appendHistoryState, findHistoryState,
  diffSnapshots, applySnapshotPatch, replayHistoryState, verifyHistoryReplay
} from '../../js/documents/documentHistory.js';
import { parseExpression } from '../helpers/legacyRootParser.js';

const snapshot = (expression, substitutions = {}) => ({ expression: parseExpression(expression), substitutions });

test('event history keeps snapshots and can independently replay the initial state', () => {
  const history = createDocumentHistory();
  const original = snapshot('a+b');
  const first = appendHistoryState(history, original, { actionLabel: 'Initial', kind: 'construction' });
  assert.equal(first.event.ruleId, null);
  assert.equal(first.event.schemaVersion, 1);
  assert.deepEqual(replayHistoryState(history, first.id), original);
  assert.equal(verifyHistoryReplay(history), true);
});

test('events record rule metadata and generated node IDs without altering originals', () => {
  const history = createDocumentHistory();
  const original = snapshot('a+b');
  appendHistoryState(history, original, { actionLabel: 'Initial', kind: 'construction' });
  const next = structuredClone(original);
  next.expression.operands.reverse();
  const second = appendHistoryState(history, next, {
    actionLabel: 'Swap addends', operation: {
      ruleId: 'addition.commutative', ruleVersion: 1,
      affectedNodeIds: next.expression.operands.map(n => n.id), inputs: { direction: 'left' }
    }
  });
  assert.equal(second.event.ruleId, 'addition.commutative');
  assert.equal(second.event.ruleVersion, 1);
  assert.deepEqual(second.event.generatedNodeIds, []);
  assert.deepEqual(replayHistoryState(history, second.id), next);
  assert.deepEqual(original.expression.operands.map(n=>n.name), ['a','b']);
});

test('branch replay follows each parent independently, without losing siblings', () => {
  const history = createDocumentHistory();
  const original = snapshot('a+b');
  const root = appendHistoryState(history, original, { actionLabel: 'Initial', kind: 'construction' });
  const branchA = snapshot('a+c');
  const a = appendHistoryState(history, branchA, { actionLabel: 'Free edit A', kind: 'free-edit' });
  history.currentNodeId = root.id;
  const branchB = snapshot('a+d');
  const b = appendHistoryState(history, branchB, { actionLabel: 'Free edit B', kind: 'free-edit' });
  assert.deepEqual(findHistoryState(history, root.id).children, [a.id,b.id]);
  assert.deepEqual(replayHistoryState(history, a.id), branchA);
  assert.deepEqual(replayHistoryState(history, b.id), branchB);
  assert.equal(verifyHistoryReplay(history), true);
});

test('context edits are replayable and are not labelled as mathematical proofs', () => {
  const history = createDocumentHistory();
  const start = snapshot('x+2');
  appendHistoryState(history, start, { actionLabel: 'Initial', kind: 'construction' });
  const assigned = { expression: structuredClone(start.expression), substitutions: { x: 4 } };
  const event = appendHistoryState(history, assigned, { actionLabel: 'Test x=4', kind: 'context-edit' });
  assert.equal(event.event.ruleId, null);
  assert.deepEqual(replayHistoryState(history, event.id).substitutions, { x: 4 });
});

test('replay preserves explicit node IDs, presentation metadata and new IDs', () => {
  const history = createDocumentHistory();
  const original = snapshot('a');
  appendHistoryState(history, original, { actionLabel: 'Initial', kind: 'construction' });
  const result = snapshot('a*1');
  const entry = appendHistoryState(history, result, { actionLabel: 'Introduce identity', kind: 'rule-transform', operation: { ruleId: 'multiplication.identity.introduce', ruleVersion: 1 } });
  // History-generated IDs describe the actual occurrence-set difference between
  // snapshots, not merely the IDs claimed by a mathematical rule. These two
  // snapshots are parsed independently, so several IDs may be new even though
  // the displayed change looks like inserting only one identity factor.
  // Traverse the snapshot AST independently of the history implementation so
  // fabricated or incomplete generatedNodeIds cannot satisfy this assertion.
  const collectSnapshotIds = (node, found = new Set()) => {
    if (!node || typeof node !== 'object') return found;
    if (typeof node.id === 'string') found.add(node.id);
    for (const key of ['operands', 'left', 'right', 'operand', 'child']) {
      const children = node[key];
      if (Array.isArray(children)) {
        for (const child of children) collectSnapshotIds(child, found);
      } else {
        collectSnapshotIds(children, found);
      }
    }
    return found;
  };
  const beforeIds = collectSnapshotIds(original.expression);
  const afterIds = collectSnapshotIds(result.expression);
  const expectedGeneratedIds = new Set(
    [...afterIds].filter((id) => !beforeIds.has(id))
  );
  assert.deepEqual(
    new Set(entry.event.generatedNodeIds),
    expectedGeneratedIds,
    'history-generated IDs must equal the new snapshot occurrence IDs'
  );
  assert.equal(
    entry.event.generatedNodeIds.length,
    expectedGeneratedIds.size,
    'history-generated IDs must not contain duplicates'
  );
  assert.deepEqual(replayHistoryState(history, entry.id), result);
});

test('patch supports removed properties and rejects unsafe paths', () => {
  const old = { expression: { id:'node-1', type:'Number', value:3, oldStyle:'dot' }, substitutions: { x: 2 } };
  const next = { expression: { id:'node-1', type:'Number', value:4 }, substitutions: {} };
  assert.deepEqual(applySnapshotPatch(old, diffSnapshots(old,next)), next);
  assert.throws(() => applySnapshotPatch(old, [{op:'set',path:['__proto__','polluted'],value:true}]));
});

test('replay detects corrupted events and does not trust cached snapshots', () => {
  const history = createDocumentHistory();
  appendHistoryState(history, snapshot('a'), {actionLabel:'Initial',kind:'construction'});
  const next = appendHistoryState(history, snapshot('b'), {actionLabel:'Edit',kind:'free-edit'});
  next.event.patch[0].value = { corrupted:true };
  assert.throws(() => replayHistoryState(history, next.id), /differs/);
});

test('event payloads remain JSON serializable for future offline storage', () => {
  const history = createDocumentHistory();
  appendHistoryState(history, snapshot('a=b'), {actionLabel:'Initial',kind:'construction'});
  assert.equal(verifyHistoryReplay(JSON.parse(JSON.stringify(history))), true);
});

test('compact event-only export can hydrate all branches and keep current cursor', async () => {
  const { exportEventHistory, hydrateHistorySnapshots } = await import('../../js/documents/documentHistory.js');
  const history = createDocumentHistory();
  const root = appendHistoryState(history, snapshot('a+b'), {actionLabel:'Initial',kind:'construction'});
  appendHistoryState(history, snapshot('a+c'), {actionLabel:'Edit',kind:'free-edit'});
  history.currentNodeId = root.id;
  appendHistoryState(history, snapshot('a+d'), {actionLabel:'Alternative',kind:'free-edit'});
  const compact = exportEventHistory(history);
  assert.equal(compact.nodes.some(n => 'snapshot' in n), false);
  const restored = hydrateHistorySnapshots(JSON.parse(JSON.stringify(compact)));
  assert.equal(restored.currentNodeId, history.currentNodeId);
  assert.equal(verifyHistoryReplay(restored), true);
  assert.deepEqual(restored.nodes.map(n=>n.snapshot), history.nodes.map(n=>n.snapshot));
});
