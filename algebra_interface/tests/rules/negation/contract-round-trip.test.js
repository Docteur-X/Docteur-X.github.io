import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToInput } from '../../helpers/legacyRootParser.js';
import { describeNegationCandidate } from '../../../js/rules/negation/visual.js';
import { proposeExpandNegation, proposeCompressNegation } from '../../../js/engine/operations/negation.js';

/**
 * Compare meaningful AST structure, not occurrence IDs. Parsing a new input
 * creates new IDs by design; a structural round trip must retain grouping,
 * operand order, negation scope and numeric-vs-unary representation.
 * Multiplication display style is not mathematical structure and can change
 * from implicit to explicit in editable serialization.
 */
function structure(node) {
  if (!node) return null;
  switch (node.type) {
    case 'Number': return ['Number', node.value];
    case 'Symbol': return ['Symbol', node.name];
    case 'Negate': return ['Negate', structure(node.operand)];
    case 'Group': return ['Group', node.bracketStyle, structure(node.operand)];
    case 'Add': case 'Multiply': return [node.type, node.operands.map(structure)];
    case 'Equal': return ['Equal', structure(node.left), structure(node.right)];
    default: throw new Error(`Unhandled AST node in structural test: ${node.type}`);
  }
}

const CASES = [
  '-3', 'a+-3', 'a-b+c', 'a+-b+c', 'a--b', '--b', '-(-a)',
  '-a*b', '(-a)*b', '-(a*b)', 'a+-(b+c)', '-(-3)',
  '-1*(-3)', '-1*((-3))', 'a+(-b)c', 'a+(-1)b*c',
  'a+(-(b*c))', 'a=-(b+c)', 'a+[-(b+c)]', 'a+{--b}'
];

test('negation/subtraction parser round trips preserve deliberate AST structure', () => {
  for (const source of CASES) {
    const original = parseExpression(source);
    const editable = expressionToInput(original);
    const reparsed = parseExpression(editable);
    assert.deepEqual(structure(reparsed), structure(original),
      `Structural round trip changed ${source} via ${editable}`);
  }
});

test('compact numeric literals and structural negation remain distinct', () => {
  assert.deepEqual(structure(parseExpression('-3').operands[0]), ['Number', '-3']);
  assert.equal(parseExpression('-(3)').operands[0].type, 'Negate');
  assert.equal(parseExpression('a-b').operands[1].type, 'Negate');
  assert.equal(expressionToInput(parseExpression('a-b')), 'a+-b');
  assert.notDeepEqual(structure(parseExpression('-a*b')), structure(parseExpression('-(a*b)')));
});

test('semantic preview descriptions distinguish expansion from compression', () => {
  const source = parseExpression('-(a+b)');
  const negate = source.operands[0];
  const expanded = proposeExpandNegation(source, { negateNodeId: negate.id });
  assert.ok(expanded);
  const expansionVisual = describeNegationCandidate({
    action: { ruleId: 'negation.expand' }, result: expanded
  });
  assert.equal(expansionVisual.label, 'Preview: − becomes −1');
  assert.match(expansionVisual.status, /minus sign becomes an amber/);
  assert.deepEqual(expansionVisual.insertedNodeIds, expanded.insertedNodeIds);
  const product = expanded.root.operands[0];
  const compressed = proposeCompressNegation(expanded.root, {
    minusOneId: product.operands[0].id, targetNodeId: product.operands[1].id
  });
  assert.ok(compressed);
  const compressionVisual = describeNegationCandidate({
    action: { ruleId: 'negation.compress' }, result: compressed
  });
  assert.equal(compressionVisual.label, 'Preview: −1 becomes −');
  assert.match(compressionVisual.status, /amber minus sign/);
  assert.deepEqual(compressionVisual.insertedOperatorOwnerIds,
    compressed.insertedOperatorOwnerIds);
  assert.throws(() => describeNegationCandidate({
    action: { ruleId: 'negation.unknown' }, result: {}
  }), /Unknown negation preview rule/);
});
