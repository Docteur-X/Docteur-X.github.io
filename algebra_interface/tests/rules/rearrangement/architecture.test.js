import test from 'node:test';
import assert from 'node:assert/strict';
import { createSymbol, createAdd, createMultiply } from '../../../js/engine/nodeFactory.js';
import { rearrangementActionRequest } from '../../../js/rules/rearrangement/gesture.js';
import { proposeRearrangement, applyRearrangement } from '../../../js/rules/rearrangement/propose.js';
import { describeRearrangementFeedback } from '../../../js/rules/rearrangement/visual.js';
import { createTransformationCoordinator } from '../../../js/steps/transformationCoordinator.js';
import { setAdditionCommutative } from '../../../js/engine/operations/addition.js';
import { setMultiplicationCommutative } from '../../../js/engine/operations/multiplication.js';

const coordinator = createTransformationCoordinator({
  'addition.rearrange': { propose: proposeRearrangement, confirmationMode: 'immediate' },
  'multiplication.rearrange': { propose: proposeRearrangement, confirmationMode: 'immediate' }
});

for (const [type, factory, setCommutative] of [
  ['Add', createAdd, setAdditionCommutative],
  ['Multiply', createMultiply, setMultiplicationCommutative]
]) {
  test(`${type} rearrangement: immutable gesture, pure preview, and ID-preserving commit`, () => {
    const [a,b,c] = ['a','b','c'].map(createSymbol);
    const root = factory([a,b,c]);
    const action = rearrangementActionRequest({parentId:root.id,parentType:type,draggedNodeId:a.id,destinationIndex:2});
    assert.ok(Object.isFrozen(action) && Object.isFrozen(action.parameters));
    const candidate = coordinator.propose(root, action);
    assert.equal(candidate.confirmationMode, 'immediate');
    assert.deepEqual(root.operands.map(n=>n.id), [a.id,b.id,c.id]);
    const feedback = describeRearrangementFeedback(candidate);
    assert.deepEqual(feedback.visualOrder, [b.id,c.id,a.id]);
    assert.equal(applyRearrangement(root, action.parameters), true);
    assert.deepEqual(root.operands.map(n=>n.id), [b.id,c.id,a.id]);
    setCommutative(false);
    try {
      assert.equal(coordinator.propose(root, rearrangementActionRequest({parentId:root.id,parentType:type,draggedNodeId:a.id,destinationIndex:0})), null);
    } finally { setCommutative(true); }
  });
}

test('rearrangement rejects invalid slots and stale/incorrect parent IDs', () => {
  const a=createSymbol('a'), b=createSymbol('b'), root=createAdd([a,b]);
  assert.equal(rearrangementActionRequest({parentId:root.id,parentType:'Add',draggedNodeId:a.id,destinationIndex:-1}),null);
  assert.equal(coordinator.propose(root,rearrangementActionRequest({parentId:'missing',parentType:'Add',draggedNodeId:a.id,destinationIndex:1})),null);
  assert.equal(coordinator.propose(root,rearrangementActionRequest({parentId:root.id,parentType:'Multiply',draggedNodeId:a.id,destinationIndex:1})),null);
  assert.equal(coordinator.propose(root,rearrangementActionRequest({parentId:root.id,parentType:'Add',draggedNodeId:a.id,destinationIndex:2})),null);
});

