import test from 'node:test';
import assert from 'node:assert/strict';
import { publishPreparedTransformation } from '../js/manipulator/transformationPublication.js';
import { createApplicationTransformationFeatures } from '../js/composition/transformationFeatureAssembly.js';
import { createTransformationCoordinator } from '../js/manipulator/transformationCoordinator.js';
import { candidateStage, materializedRoot } from '../js/manipulator/transformationCandidate.js';
import { parseExpression } from '../js/core/parser.js';

const stateFor = () => {
  const root = parseExpression('a+b');
  return { expressionRoot: root, history: { currentId: 1 },
    mathematicalDocument: { id:'doc-1', kind:'expression', root,
      history: {currentId:1}, metadata:{updatedAt:'old'} } };
};

test('v3 publishes root, history and document together, without changing source objects', () => {
  const state = stateFor();
  const oldDoc = state.mathematicalDocument;
  const staged = {root:parseExpression('a+b+c'), history:{currentId:2}};
  publishPreparedTransformation({state, staged});
  assert.equal(state.expressionRoot, staged.root);
  assert.equal(state.history, staged.history);
  assert.equal(state.mathematicalDocument.history, staged.history);
  assert.equal(state.mathematicalDocument, oldDoc);
  assert.notEqual(oldDoc.metadata.updatedAt, 'old');
});

test('v3 invalid document preparation leaves every authoritative reference unchanged', () => {
  const state = stateFor();
  const old = {root:state.expressionRoot, history:state.history, document:state.mathematicalDocument};
  assert.throws(() => publishPreparedTransformation({state, staged:{root:{type:'Invalid'},history:{currentId:2}}}));
  assert.equal(state.expressionRoot,old.root);
  assert.equal(state.history,old.history);
  assert.equal(state.mathematicalDocument,old.document);
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
  assert.equal(candidateStage({result:{proposal:{root:{id:'r'}}}}),'materialized');
});
