import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../../helpers/legacyRootParser.js';
import { findNodeById } from '../../../js/engine/treeUtils.js';
import { proposeCompressNegation } from '../../../js/engine/operations/negation.js';
import { resolveNegationCompressionTarget } from '../../../js/rules/negation/compressionTarget.js';

function product(input) { return parseExpression(input).operands[0]; }

test('compression preserves the chosen Group and marks the new operator for preview', () => {
  const source = parseExpression('-1*(a+b)');
  const [one, group] = source.operands[0].operands;
  const before = structuredClone(source);
  const result = proposeCompressNegation(source, { minusOneId: one.id, targetNodeId: group.id });
  assert.ok(result);
  assert.deepEqual(source, before);
  assert.equal(result.root.operands[0].type, 'Negate');
  assert.equal(result.root.operands[0].operand.id, group.id);
  assert.deepEqual(result.insertedOperatorOwnerIds, [result.root.operands[0].id]);
  assert.equal(findNodeById(result.root, one.id), null);
});

// Compression of a longer product must preserve the product and untouched factors;
// the two-factor tests above exercise the separate collapsing-product branch.
test('compression retains a longer product and unrelated factor IDs', () => {
  const source = parseExpression('-1*(a+b)*c');
  const originalProduct = source.operands[0];
  const [minusOne, group, tail] = originalProduct.operands;
  const before = structuredClone(source);

  const result = proposeCompressNegation(source, {
    minusOneId: minusOne.id,
    targetNodeId: group.id
  });
  assert.ok(result);

  const product = result.root.operands[0];
  assert.equal(product.type, 'Multiply');
  assert.equal(product.id, originalProduct.id);
  assert.equal(product.operands.length, 2);

  const [negation, remainingFactor] = product.operands;
  assert.equal(negation.type, 'Negate');
  assert.equal(negation.operand.id, group.id);
  assert.equal(remainingFactor.id, tail.id);
  assert.deepEqual(result.insertedOperatorOwnerIds, [negation.id]);
  assert.equal(findNodeById(result.root, minusOne.id), null);
  assert.deepEqual(source, before);
});

test('numeric leaf stays numeric; explicit group creates structural negation', () => {
  const root = parseExpression('-1*(-3)');
  const [one, group] = root.operands[0].operands;
  assert.equal(proposeCompressNegation(root, { minusOneId: one.id, targetNodeId: group.operand.id }), null);
  assert.equal(proposeCompressNegation(root, { minusOneId: one.id, targetNodeId: group.id }).root.operands[0].type, 'Negate');
});

test('DOM targeting selects the actual bracket Group, never promotes its inner number', () => {
  const root = parseExpression('-1*(-3)');
  const product = root.operands[0];
  const [one, group] = product.operands;
  const bracket = { dataset: { nodeId: group.id }, closest: () => bracket };
  const number = { dataset: { nodeId: group.operand.id }, closest: () => number };
  const originalDocument = globalThis.document;
  let pointed = bracket;
  globalThis.document = { elementFromPoint: () => pointed };
  const equation = { contains: () => true };
  try {
    const args = { equation, root, sourceId: one.id, parentId: product.id, x: 10, y: 10 };
    assert.equal(resolveNegationCompressionTarget(args).nodeId, group.id);
    pointed = number;
    assert.equal(resolveNegationCompressionTarget(args), null);
    assert.equal(resolveNegationCompressionTarget({ ...args, sourceId: group.id }), null);
  } finally { globalThis.document = originalDocument; }
});
