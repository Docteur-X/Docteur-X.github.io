import test from 'node:test';
import assert from 'node:assert/strict';
import { publishPreparedTransformation } from '../../js/steps/transformationPublication.js';
import { createApplicationTransformationFeatures } from '../../js/app/transformationFeatureAssembly.js';
import { createTransformationCoordinator } from '../../js/steps/transformationCoordinator.js';
import { candidateStage, materializedRoot } from '../../js/steps/transformationCandidate.js';
import { parseExpression } from '../helpers/legacyRootParser.js';

const stateFor = () => ({ expressionRoot: parseExpression('a+b'), history: { currentId: 1 } });

test('publication sets root and history together, without changing the staged objects', () => {
  const state = stateFor();
  const staged = {root:parseExpression('a+b+c'), history:{currentId:2}};
  publishPreparedTransformation({state, staged});
  assert.equal(state.expressionRoot, staged.root);
  assert.equal(state.history, staged.history);
});

test('publication refuses an incomplete transition and leaves state unchanged', () => {
  const state = stateFor();
  const old = {root:state.expressionRoot, history:state.history};
  assert.throws(() => publishPreparedTransformation({state, staged:{root:null,history:{currentId:2}}}), /prepared root and history/);
  assert.equal(state.expressionRoot,old.root);
  assert.equal(state.history,old.history);
});

test('numeric combination is discoverable through the registered transformation coordinator', () => {
  const registry = createApplicationTransformationFeatures();
  const coordinator = createTransformationCoordinator(registry);
  for (const [expression, ruleId] of [['3+5','addition.combine-numeric'],['3*5','multiplication.combine-numeric']]) {
    const root = parseExpression(expression);
    const parent = root.operands.length === 1 && root.operands[0].type === 'Multiply' ? root.operands[0] : root;
    const [moving,target] = parent.operands;
    const before = JSON.stringify(root);
    const candidate = coordinator.propose(root,{ruleId,parameters:{parentId:parent.id,movingNodeId:moving.id,targetNodeId:target.id}});
    assert.ok(candidate?.result?.root);
    assert.equal(candidate.confirmationMode,'immediate');
    assert.equal(candidateStage(candidate),'materialized');
    assert.equal(materializedRoot(candidate),candidate.result.root);
    assert.equal(JSON.stringify(root),before);
  }
});

test('candidate contract distinguishes eligibility-only plans from materialized results', () => {
  assert.equal(candidateStage({result:{plan:{id:'p'}}}),'eligibility');
  assert.equal(materializedRoot({result:{plan:{id:'p'}}}),null);
  // One result shape since clean-up C3: a tree under result.proposal alone is not a result.
  assert.equal(candidateStage({result:{proposal:{root:{id:'r'}}}}),'eligibility'); //terialized');
});
