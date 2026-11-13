// A whole side of an equation can be dragged (both-sides follow-up): its
// freshness check uses the named slot ('left'/'right'), just as strictly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { isOrdinaryDragSourceCurrent } from '../../../js/view/drag/ordinaryDragSourceValidity.js';
import { parseExpression } from '../../../js/engine/parser.js';
import { findNodeById } from '../../../js/engine/treeUtils.js';

const stamp = { documentId: 'd', objectId: 'o', revision: 1, rootId: 'r', fingerprint: 'f' };
const check = (root, drag) => isOrdinaryDragSourceCurrent({ drag: { arbitrationSourceStamp: stamp, ...drag },
  currentStamp: stamp, root, findNodeById });

test('a whole side is current while it is still in its named slot', () => {
  const root = parseExpression('x=2y+3');
  assert.equal(check(root, { item: root.left, parentId: root.id, startIndex: 'left' }), true);
  assert.equal(check(root, { item: root.left, parentId: root.id, startIndex: 'right' }), false);
});

test('numbered slots are unchanged', () => {
  const root = parseExpression('a+b');
  assert.equal(check(root, { item: root.operands[1], parentId: root.id, startIndex: 1 }), true);
  assert.equal(check(root, { item: root.operands[1], parentId: root.id, startIndex: 0 }), false);
});

import { decideOrdinaryDragDrop } from '../../../js/view/drag/ordinaryDragDropDecision.js';
test('no target under the pointer is a plain cancel, not a stale drag', () => {
  const decision = decideOrdinaryDragDrop({ commit: true, moved: true, drag: {}, target: { kind: 'none' },
    sourceValid: true, modalBlocked: false, validate: () => false, arbitrate: () => ({ status: 'none' }) });
  assert.equal(decision.status, 'none');
});
