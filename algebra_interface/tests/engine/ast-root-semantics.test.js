/** AST Root Semantics v1: test the PRODUCTION parser, not legacy fixtures. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToInput } from '../../js/engine/parser.js';
import { normaliseWithRules } from '../../js/engine/normalization.js';
import { createAdd, createSymbol } from '../../js/engine/nodeFactory.js';
import { mapMathematicalOccurrences } from '../../js/view/rendering/semanticContainerMap.js';
import { proposeIdentityInsertion } from '../../js/engine/operations/identityInsertion.js';
import { getDistributionPlan, applyDistribution, unwrapGroupedSum } from '../../js/engine/operations/distribution.js';
import { proposeExpandNegation, proposeCompressNegation } from '../../js/engine/operations/negation.js';
import { wrapNodeInGroup, removeGroup } from '../../js/engine/operations/grouping.js';

for (const [input, expected] of [
  ['3','Number'], ['a','Symbol'], ['((3))','Group'],
  ['a(b+c)','Multiply'], ['-(a+b)','Negate'],
  ['a+b+c','Add'], ['a=b','Equal']
]) {
  test(`natural root ${input} is ${expected}`, () => {
    const root = parseExpression(input);
    assert.equal(root.type, expected);
    assert.equal(expressionToInput(root), input === 'a(b+c)' ? 'a (b+c)' : input);
    assert.equal(mapMathematicalOccurrences(root)[0].nodeId, root.id);
  });
}

test('normalisation collapses historical unary Add without losing child identity', () => {
  const child = createSymbol('a');
  const old = createAdd([child]);
  assert.equal(normaliseWithRules(old), child);
});

test('explicit root grouping is reversible and retains original occurrence identity', () => {
  const source = parseExpression('a');
  const grouped = wrapNodeInGroup(source, source.id);
  assert.equal(grouped.type, 'Group');
  assert.equal(grouped.operand.id, source.id);
  assert.equal(removeGroup(grouped, grouped.id).id, source.id);
});

test('identity introduction can wrap a root occurrence without a synthetic parent', () => {
  const root = parseExpression('a');
  const result = proposeIdentityInsertion(root, { operation: 'Add', targetNodeId: root.id, side: 'right' });
  assert.equal(result.root.type, 'Add');
  assert.equal(result.root.operands[0].id, root.id);
  assert.equal(result.root.operands[1].value, '0');
});

test('root-level distribution returns the new Add root, without mutating source', () => {
  const root = parseExpression('a(b+c)');
  const original = structuredClone(root);
  const sum = unwrapGroupedSum(root.operands[1]);
  const plan = getDistributionPlan(root, root.operands[0].id, sum.id);
  const detached = structuredClone(root);
  const result = applyDistribution(detached, plan);
  assert.equal(result.root.type, 'Add');
  assert.equal(result.root.operands.length, 2);
  assert.deepEqual(root, original);
});

test('root negation expansion and compression work with no artificial Add', () => {
  const root = parseExpression('-(a+b)');
  const expanded = proposeExpandNegation(root, { negateNodeId: root.id });
  assert.equal(expanded.root.type, 'Multiply');
  const [minusOne, group] = expanded.root.operands;
  const compressed = proposeCompressNegation(expanded.root, { minusOneId: minusOne.id, targetNodeId: group.id });
  assert.equal(compressed.root.type, 'Negate');
  assert.equal(compressed.root.operand.id, group.id);
});
