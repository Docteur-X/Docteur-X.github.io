import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../js/core/parser.js';
import { findNodeById } from '../js/core/treeUtils.js';
import { proposeCompressNegation } from '../js/operations/negation.js';
import { resolveNegationCompressionTarget } from '../js/interaction/negationCompressionTarget.js';

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
