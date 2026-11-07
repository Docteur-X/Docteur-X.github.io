import test from 'node:test';
import assert from 'node:assert/strict';
import { identityActionRequest } from '../js/manipulator/actionRequests.js';
import { interpretIdentityPointer } from '../js/manipulator/identityGesture.js';
import { createTransformationCoordinator } from '../js/manipulator/transformationCoordinator.js';
import { createPreviewCoordinator } from '../js/manipulator/previewCoordinator.js';
import { describeIdentityPreview } from '../js/manipulator/identityVisual.js';
import { parseExpression } from '../js/core/parser.js';
import { proposeIdentityInsertion } from '../js/operations/identityInsertion.js';

test('identity gesture produces a DOM-free, immutable rule request', () => {
  const action = identityActionRequest({ operation: 'Add', targetNodeId: 'n1', side: 'left' });
  assert.equal(action.ruleId, 'identity.introduce');
  assert.deepEqual(action.parameters, { operation: 'Add', targetNodeId: 'n1', side: 'left' });
  assert.equal(Object.isFrozen(action.parameters), true);
  assert.equal(identityActionRequest({ operation: 'Add', targetNodeId: 'n1', side: 'middle' }), null);
});

test('identity hit testing resolves operator first, then left/right operand halves', () => {
  const container = { contains: el => Boolean(el) };
  const operand = { dataset: { nodeId: 'n2' }, getBoundingClientRect: () => ({ left: 10, width: 100 }),
    closest: selector => selector.includes('.add-operand') ? operand : null };
  assert.equal(interpretIdentityPointer(container, operand, 20, 'Add').action.parameters.side, 'left');
  assert.equal(interpretIdentityPointer(container, operand, 95, 'Add').action.parameters.side, 'right');
  const operator = { dataset: { operatorParentId: 'sum', operatorIndex: '1' },
    classList: { contains: x => x === 'plus' }, closest: selector => selector.includes('.plus') ? operator : null };
  assert.equal(interpretIdentityPointer(container, operator, 40, 'Add').action.parameters.insertionIndex, 1);
  assert.equal(interpretIdentityPointer(container, null, 40, 'Add'), null);
});

test('coordinator delegates mathematical eligibility to the engine and produces candidate metadata', () => {
  const root = parseExpression('a+b');
  const node = root.operands[0];
  const coordinator = createTransformationCoordinator({ 'identity.introduce': { propose: proposeIdentityInsertion } });
  const candidate = coordinator.propose(root, identityActionRequest({ operation: 'Add', targetNodeId: node.id, side: 'right' }));
  assert.ok(candidate?.result?.identityNodeId);
  assert.equal(candidate.confirmationMode, 'preview');
  assert.equal(coordinator.propose(root, { ruleId: 'missing', parameters: {} }), null);
  const visual = describeIdentityPreview(candidate);
  assert.equal(visual.confirmationNodeId, candidate.result.identityNodeId);
  assert.equal(visual.proposedRoot, candidate.result.root);
});

test('preview lifecycle does not commit, rejects stale revisions, and permits cancellation', () => {
  const previews = createPreviewCoordinator();
  const candidate = { result: { root: {} } };
  assert.equal(previews.open(candidate, 'state-1'), true);
  assert.equal(previews.open(candidate, 'state-1'), false);
  assert.equal(previews.confirm('state-2'), null);
  assert.equal(previews.isOpen(), false);
  previews.open(candidate, 'state-1');
  assert.equal(previews.confirm('state-1'), candidate);
  previews.open(candidate, 'state-3');
  previews.cancel();
  assert.equal(previews.get(), null);
});
