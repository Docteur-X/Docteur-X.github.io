import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransformationFeatureRegistry } from '../../js/steps/transformationFeatures.js';
import { createTransformationCoordinator } from '../../js/steps/transformationCoordinator.js';
import { createApplicationTransformationFeatures } from '../../js/app/transformationFeatureAssembly.js';
import { parseExpression } from '../helpers/legacyRootParser.js';
import { equalityFunctionActionRequest } from '../../js/rules/equality/gesture.js';

// Contract tests protect architectural boundaries, not CSS implementation.
test('contract accepts multiple gesture entry points and freezes registry metadata', () => {
  const adapters = [() => null, () => null];
  const registry = createTransformationFeatureRegistry([{
    id: 'sample', propose: () => ({ok:true}), gestures: adapters,
    feedback: () => ({kind:'eligible'}), confirmationMode:'preview'
  }]);
  adapters.push(() => null);
  assert.equal(registry.get('sample').gestures.length, 2);
  assert.equal(Object.isFrozen(registry.get('sample').gestures), true);
  assert.throws(() => createTransformationFeatureRegistry([{
    id:'bad', propose:()=>null, gestures:[3], confirmationMode:'preview'
  }]), /gesture/);
  const coordinator = createTransformationCoordinator(registry);
  assert.deepEqual(coordinator.feedback(coordinator.propose({id:'root'}, {ruleId:'sample',parameters:{}})), {kind:'eligible'});
});

test('equality application is proposed through the same registry and coordinator as other rules', () => {
  const registry = createApplicationTransformationFeatures();
  const feature = registry.get('equality.apply-function');
  assert.equal(typeof feature.gesture, 'function');
  assert.equal(feature.gestures.length, 1);
  const coordinator = createTransformationCoordinator(registry);
  const equation = parseExpression('a=b');
  const operand = parseExpression('c+d');
  const before = JSON.stringify(equation);
  const action = equalityFunctionActionRequest({relationId:equation.id,context:'add-right',
    clipboardId:'clip-1',documentId:'doc-1',objectId:'obj-1',revision:0});
  const candidate = coordinator.propose(equation, {
    ...action, parameters: {...action.parameters, operandRoot:operand}
  });
  assert.equal(candidate.confirmationMode, 'preview');
  assert.equal(candidate.result.root.type, 'Equal');
  assert.deepEqual(coordinator.describe(candidate).insertedOperandIds,
    candidate.result.visualRoles.insertedOperandIds);
  assert.equal(coordinator.feedback(candidate).relationId, equation.id);
  assert.equal(JSON.stringify(equation), before, 'proposal must not mutate source AST');
  assert.equal(coordinator.propose(equation, {...action, parameters:{...action.parameters,
    relationId:'wrong',operandRoot:operand}}), null);
  assert.equal(coordinator.propose(equation, {...action, parameters:{...action.parameters,
    operandRoot:parseExpression('c=d')}}), null);
});
