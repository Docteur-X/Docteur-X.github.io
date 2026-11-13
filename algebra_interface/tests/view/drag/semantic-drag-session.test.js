import test from 'node:test';
import assert from 'node:assert/strict';
import { createSemanticDragSession, checkSemanticDragSession } from '../../../js/view/drag/semanticDragSession.js';
const stamp = Object.freeze({ documentId: 'd', objectId: 'o', revision: 'r', rootId: 'root', fingerprint: 'tree' });
const args = { viewId: 'v', source: 'operand', parentId: 'sum', pointerId: 7, renderGeneration: 4, sourceStamp: stamp };
test('semantic drag session is immutable and valid for matching source', () => {
  const session = createSemanticDragSession(args);
  assert.ok(Object.isFrozen(session));
  assert.ok(Object.isFrozen(session.source));
  assert.ok(Object.isFrozen(session.sourceStamp));
  assert.equal(checkSemanticDragSession(session, args), null);
});
test('drag session rejects another pointer or view', () => {
  const session = createSemanticDragSession(args);
  assert.equal(checkSemanticDragSession(session, { ...args, pointerId: 8 }), 'different-pointer');
  assert.equal(checkSemanticDragSession(session, { ...args, viewId: 'v2' }), 'different-view');
});
test('drag session rejects rerender and mutated mathematical source', () => {
  const session = createSemanticDragSession(args);
  assert.equal(checkSemanticDragSession(session, { ...args, renderGeneration: 5 }), 'stale-render');
  assert.equal(checkSemanticDragSession(session, { ...args, sourceStamp: { ...stamp, fingerprint: 'changed' } }), 'stale-source');
  assert.equal(checkSemanticDragSession(session, { ...args, sourceStamp: { ...stamp, revision: 'new' } }), 'stale-source');
});
test('drag session rejects malformed creation and missing context', () => {
  assert.throws(() => createSemanticDragSession({ ...args, renderGeneration: -1 }), TypeError);
  assert.throws(() => createSemanticDragSession({ ...args, sourceStamp: {} }), TypeError);
  assert.equal(checkSemanticDragSession(null, args), 'no-session');
  assert.equal(checkSemanticDragSession(createSemanticDragSession(args), { ...args, sourceStamp: null }), 'stale-source');
});
