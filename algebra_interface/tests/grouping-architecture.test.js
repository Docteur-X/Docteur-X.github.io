import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToInput } from '../js/core/parser.js';
import { cloneExpression } from '../js/core/nodeFactory.js';
import { getRangeGroupingPlan, groupOperandRange } from '../js/operations/grouping.js';
import { groupingActionRequest } from '../js/manipulator/groupingGesture.js';
import { describeGroupingPreview } from '../js/manipulator/groupingVisual.js';
import { createTransformationCoordinator } from '../js/manipulator/transformationCoordinator.js';
import { createPreviewCoordinator } from '../js/manipulator/previewCoordinator.js';
import { setAdditionAssociative } from '../js/operations/addition.js';
import { setMultiplicationAssociative } from '../js/operations/multiplication.js';

function coordinator() {
  return createTransformationCoordinator({
    'grouping.range': { propose(root, p) {
      const plan = getRangeGroupingPlan(root, p.operandIds);
      return plan && plan.parentId === p.parentId && plan.parentType === p.parentType &&
        plan.operandIds.length === p.operandIds.length &&
        plan.operandIds.every((id, i) => id === p.operandIds[i]) ? { plan } : null;
    }, confirmationMode: 'preview' }
  });
}

test('grouping adapter uses immutable ordered sibling IDs and valid bracket styles', () => {
  const root = parseExpression('a+b+c+d');
  const ids = root.operands.slice(1, 3).map(n => n.id);
  const plan = getRangeGroupingPlan(root, [...ids].reverse());
  const request = groupingActionRequest(plan, 'square');
  assert.equal(request.ruleId, 'grouping.range');
  assert.deepEqual(request.parameters.operandIds, ids);
  assert.equal(Object.isFrozen(request.parameters.operandIds), true);
  assert.equal(Object.isFrozen(request.parameters), true);
  assert.equal(groupingActionRequest(plan, 'triangle'), null);
  assert.equal(groupingActionRequest(null), null);
});

test('coordinator checks grouping eligibility without changing the source tree', () => {
  for (const [input, kind] of [['a+b+c', 'Add'], ['a*b*c', 'Multiply']]) {
    const root = parseExpression(input);
    const parent = kind === 'Add' ? root : root.operands[0];
    const ids = parent.operands.slice(0, 2).map(n => n.id);
    const request = groupingActionRequest(getRangeGroupingPlan(root, ids));
    const before = JSON.stringify(root);
    const candidate = coordinator().propose(root, request);
    assert.equal(candidate.confirmationMode, 'preview');
    assert.equal(JSON.stringify(root), before);
    const visual = describeGroupingPreview(candidate);
    assert.equal(visual.parentNodeId, parent.id);
    assert.deepEqual(visual.selectedNodeIds, ids);
    const rewritten = cloneExpression(root);
    assert.ok(groupOperandRange(rewritten, ids));
    assert.notEqual(expressionToInput(rewritten), input);
  }
});

test('nonadjacent, non-sibling, or non-associative grouping is refused', () => {
  const root = parseExpression('a+b+c+d');
  assert.equal(getRangeGroupingPlan(root, [root.operands[0].id, root.operands[2].id]), null);
  const plan = getRangeGroupingPlan(root, root.operands.slice(0, 2).map(n => n.id));
  const request = groupingActionRequest(plan);
  try {
    setAdditionAssociative(false);
    assert.equal(coordinator().propose(root, request), null);
    const product = parseExpression('a*b*c');
    setMultiplicationAssociative(false);
    const p = getRangeGroupingPlan(product, product.operands[0].operands.slice(0, 2).map(n => n.id));
    assert.equal(p, null);
  } finally {
    setAdditionAssociative(true);
    setMultiplicationAssociative(true);
  }
});

test('grouping preview rejects stale revisions and cancel preserves selection data', () => {
  const root = parseExpression('a+b+c');
  const ids = root.operands.slice(0, 2).map(n => n.id);
  const candidate = coordinator().propose(root, groupingActionRequest(getRangeGroupingPlan(root, ids)));
  const preview = createPreviewCoordinator();
  assert.equal(preview.open(candidate, 'state-1'), true);
  assert.equal(preview.confirm('state-2'), null);
  assert.equal(preview.isOpen(), false);
  assert.equal(preview.open(candidate, 'state-1'), true);
  preview.cancel();
  assert.equal(preview.get(), null);
  assert.deepEqual(ids, root.operands.slice(0, 2).map(n => n.id));
  assert.equal(preview.open(candidate, 'state-1'), true);
  assert.equal(preview.confirm('state-1'), candidate);
});
