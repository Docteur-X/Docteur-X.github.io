import test from 'node:test';
import assert from 'node:assert/strict';
import { distributionActionRequest } from '../js/manipulator/distributionGesture.js';
import { describeDistributionPreview } from '../js/manipulator/distributionVisual.js';
import { createTransformationCoordinator } from '../js/manipulator/transformationCoordinator.js';
import { createPreviewCoordinator } from '../js/manipulator/previewCoordinator.js';
import { getDistributionPlan, applyDistribution } from '../js/operations/distribution.js';
import { createAdd, createMultiply, createSymbol, createGroup } from '../js/core/nodeFactory.js';

function fixture(direction = 'left') {
  const factor = createSymbol('a');
  const sum = createAdd([createSymbol('b'), createSymbol('c')]);
  const grouped = createGroup(sum);
  const root = createAdd([createMultiply(direction === 'left' ? [factor, grouped] : [grouped, factor])]);
  const product = root.operands[0];
  return { root, plan: getDistributionPlan(product, factor.id, sum.id), factor, sum };
}

function coordinator() {
  return createTransformationCoordinator({
    'multiplication.distribute': { propose(root, p) {
      const product = root.operands[0];
      const verified = getDistributionPlan(product, p.sourceFactorId, p.sumId);
      return verified?.productId === p.productId && verified.direction === p.direction ? { plan: verified } : null;
    }, confirmationMode: 'preview' }
  });
}

test('distribution gesture produces a frozen DOM-free request', () => {
  const { plan } = fixture();
  const request = distributionActionRequest(plan);
  assert.equal(request.ruleId, 'multiplication.distribute');
  assert.deepEqual(request.parameters, plan);
  assert.ok(Object.isFrozen(request));
  assert.ok(Object.isFrozen(request.parameters));
  assert.equal(distributionActionRequest({ direction: 'left' }), null);
});

test('distribution candidate and visual description preserve left/right provenance targets', () => {
  for (const direction of ['left', 'right']) {
    const { root, plan } = fixture(direction);
    const candidate = coordinator().propose(root, distributionActionRequest(plan));
    assert.equal(candidate.confirmationMode, 'preview');
    const visual = describeDistributionPreview(candidate);
    assert.equal(visual.direction, direction);
    assert.deepEqual(visual.highlightedNodeIds, [plan.sourceFactorId, plan.sumId]);
    const rewritten = applyDistribution(root, candidate.result.plan);
    assert.ok(rewritten?.provenance);
  }
});

test('distribution preview rejects stale revisions and supports cancellation', () => {
  const { root, plan } = fixture();
  const candidate = coordinator().propose(root, distributionActionRequest(plan));
  const preview = createPreviewCoordinator();
  assert.equal(preview.open(candidate, 'state-1'), true);
  assert.equal(preview.open(candidate, 'state-1'), false);
  assert.equal(preview.confirm('state-2'), null);
  assert.equal(preview.isOpen(), false);
  assert.equal(preview.open(candidate, 'state-1'), true);
  preview.cancel();
  assert.equal(preview.confirm('state-1'), null);
  assert.equal(preview.open(candidate, 'state-1'), true);
  assert.equal(preview.confirm('state-1'), candidate);
});
