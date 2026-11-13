import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToInput } from '../../helpers/legacyRootParser.js';
import { findNodeById } from '../../../js/engine/treeUtils.js';
import { proposeExpandNegation, proposeCompressNegation } from '../../../js/engine/operations/negation.js';
import { createApplicationTransformationFeatures } from '../../../js/app/transformationFeatureAssembly.js';
import { createTransformationCoordinator } from '../../../js/steps/transformationCoordinator.js';
import { expandNegationAction } from '../../../js/rules/negation/gesture.js';

test('subtraction, negative literals, grouped negation and explicit addition parse distinctly', () => {
  const subtract = parseExpression('a-b+c');
  assert.equal(subtract.operands[1].type, 'Negate');
  assert.equal(subtract.operands[1].operand.name, 'b');
  assert.equal(expressionToInput(subtract), 'a+-b+c');
  assert.equal(parseExpression('-3').operands[0].value, '-3');
  assert.equal(parseExpression('a+-3').operands[1].value, '-3');
  assert.equal(parseExpression('-(3)').operands[0].type, 'Negate');
  assert.equal(parseExpression('-(3)').operands[0].operand.type, 'Group');
  assert.equal(parseExpression('a--b').operands[1].operand.type, 'Negate');
  assert.equal(parseExpression('-a*b').operands[0].operands[0].type, 'Negate');
  assert.equal(parseExpression('-(a*b)').operands[0].type, 'Negate');
  assert.throws(() => parseExpression('a-'), /needs an expression/);
});

test('expansion constructs a detached candidate, preserving operand identities', () => {
  const source = parseExpression('a+-(b c)');
  const before = structuredClone(source);
  const negate = source.operands[1];
  const childId = negate.operand.id;
  const registry = createApplicationTransformationFeatures();
  const coordinator = createTransformationCoordinator(registry);
  const candidate = coordinator.propose(source, expandNegationAction(negate.id));
  assert.ok(candidate);
  const product = candidate.result.root.operands[1];
  assert.equal(product.type, 'Multiply');
  assert.equal(product.operands[0].value, '-1');
  // Provenance must name the real inserted -1 occurrence, not merely an ID-shaped value.
  assert.deepEqual(
    candidate.result.insertedNodeIds,
    [product.operands[0].id],
    'expansion provenance must identify the actual inserted -1'
  );
  assert.equal(product.operands[1].id, childId);
  assert.deepEqual(source, before);
  assert.equal(findNodeById(candidate.result.root, negate.id), null);
  assert.equal(proposeExpandNegation(source, { negateNodeId: 'missing' }), null);
});

test('compression targets an explicit group but not a bare numeric leaf', () => {
  const source = parseExpression('-1*(b c)');
  const product = source.operands[0];
  const [minusOne, group] = product.operands;
  const before = structuredClone(source);
  const candidate = proposeCompressNegation(source, { minusOneId: minusOne.id, targetNodeId: group.id });
  assert.ok(candidate);
  assert.equal(candidate.root.operands[0].type, 'Negate');
  assert.equal(candidate.root.operands[0].operand.id, group.id);
  assert.deepEqual(source, before);
  const numeric = parseExpression('-1*(-3)');
  const [one, grouped] = numeric.operands[0].operands;
  assert.ok(proposeCompressNegation(numeric, { minusOneId: one.id, targetNodeId: grouped.id }));
  assert.equal(proposeCompressNegation(numeric, { minusOneId: one.id, targetNodeId: grouped.operand.id }), null);
});
