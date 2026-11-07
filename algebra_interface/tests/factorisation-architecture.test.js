import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../js/core/parser.js';
import { getFactorisationPlan, applyFactorisation } from '../js/operations/factorisation.js';
import { factorisationActionRequest } from '../js/manipulator/factorisationGesture.js';
import { describeFactorisationPreview } from '../js/manipulator/factorisationVisual.js';
import { createTransformationCoordinator } from '../js/manipulator/transformationCoordinator.js';
import { createPreviewCoordinator } from '../js/manipulator/previewCoordinator.js';
import { checkFactorisationTeachingPolicy } from '../js/teaching/factorisationPolicy.js';

function fixture(input) {
  const root = parseExpression(input);
  const sum = root.operands[0].operand;
  const ids = sum.operands.map(product => product.operands[0].id);
  return { root, ids };
}

function coordinator() {
  const propose = (root, p) => {
    const plan = getFactorisationPlan(root, p.sourceFactorIds);
    if (!plan || plan.direction !== p.direction || plan.sumId !== p.sumId ||
      plan.groupId !== p.groupId || plan.productIds.join('|') !== p.productIds.join('|') ||
      !checkFactorisationTeachingPolicy(root, plan).allowed) return null;
    const proposal = applyFactorisation(root, plan);
    return proposal ? { plan, proposal } : null;
  };
  return createTransformationCoordinator({
    'factorisation.left': { propose }, 'factorisation.right': { propose }
  });
}

test('factorisation gesture creates a frozen, DOM-free request', () => {
  const { root, ids } = fixture('(a*b+a*c)');
  const plan = getFactorisationPlan(root, ids);
  const request = factorisationActionRequest(plan);
  assert.equal(request.ruleId, 'factorisation.left');
  assert.equal(Object.isFrozen(request.parameters), true);
  assert.equal(Object.isFrozen(request.parameters.sourceFactorIds), true);
  assert.equal(factorisationActionRequest(null), null);
  assert.equal(factorisationActionRequest({ direction: 'left', sumId: 'x', sourceFactorIds: ['a', 'a'], productIds: [] }), null);
});

test('factorisation coordinator keeps the source tree unchanged and returns semantic visual roles', () => {
  const { root, ids } = fixture('(a*b+a*c)');
  const before = JSON.stringify(root);
  const candidate = coordinator().propose(root, factorisationActionRequest(getFactorisationPlan(root, ids)));
  assert.ok(candidate);
  assert.equal(JSON.stringify(root), before);
  const visual = describeFactorisationPreview(candidate);
  assert.equal(visual.kind, 'factorisation');
  assert.deepEqual(visual.sourceNodeIds, ids);
  assert.equal(visual.resultNodeId, candidate.result.proposal.extractedFactorId);
});

test('factorisation coordinator respects teaching scope', () => {
  const root = parseExpression('a*b+a*c');
  const ids = root.operands.map(p => p.operands[0].id);
  const action = factorisationActionRequest(getFactorisationPlan(root, ids));
  assert.ok(action, 'mathematically valid plan exists');
  assert.equal(coordinator().propose(root, action), null, 'unbracketed scope rejected by policy');
});

test('factorisation preview lifecycle rejects stale confirmations and supports cancel', () => {
  const { root, ids } = fixture('(a*b+a*c)');
  const candidate = coordinator().propose(root, factorisationActionRequest(getFactorisationPlan(root, ids)));
  const lifecycle = createPreviewCoordinator();
  assert.equal(lifecycle.open(candidate, 'state-1'), true);
  assert.equal(lifecycle.confirm('state-2'), null);
  assert.equal(lifecycle.isOpen(), false);
  assert.equal(lifecycle.open(candidate, 'state-1'), true);
  lifecycle.cancel();
  assert.equal(lifecycle.confirm('state-1'), null);
});
