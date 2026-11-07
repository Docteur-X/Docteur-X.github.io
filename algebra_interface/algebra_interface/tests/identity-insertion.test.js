import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../js/core/parser.js';
import { findNodeById } from '../js/core/treeUtils.js';
import { proposeIdentityInsertion } from '../js/operations/identityInsertion.js';
import { setAdditionAssociative } from '../js/operations/addition.js';
import { setMultiplicationAssociative } from '../js/operations/multiplication.js';

test('additive identity is inserted before or after a hitbox, preserving existing IDs', () => {
  for (const side of ['left', 'right']) {
    const root = parseExpression('a+b+c');
    const id = root.operands[1].id;
    const result = proposeIdentityInsertion(root, {operation:'Add', targetNodeId:id, side});
    assert.equal(root.operands.length, 3);
    assert.equal(result.root.operands.length, 4);
    assert.equal(result.root.id, root.id);
    assert.equal(findNodeById(result.root, id).name, 'b');
    assert.equal(result.root.operands[side === 'left' ? 1 : 2].value, 0);
  }
});

test('multiplicative identity inserts at a factor edge and into a product gap', () => {
  const root = parseExpression('a*b*c');
  const product = root.operands[0];
  const after = proposeIdentityInsertion(root, {operation:'Multiply', targetNodeId:product.operands[0].id, side:'right'});
  assert.equal(after.root.operands[0].operands[1].value, 1);
  const between = proposeIdentityInsertion(root, {operation:'Multiply', parentNodeId:product.id, insertionIndex:2});
  assert.equal(between.root.operands[0].operands[2].value, 1);
  assert.equal(root.operands[0].operands.length, 3);
});

test('wrapping a factor in an addition creates a new operation without deleting the factor', () => {
  const root = parseExpression('a*b');
  const original = root.operands[0].operands[0];
  const result = proposeIdentityInsertion(root, {operation:'Add', targetNodeId:original.id, side:'right'});
  const wrapper = result.root.operands[0].operands[0];
  assert.equal(wrapper.type, 'Add');
  assert.equal(wrapper.operands[0].id, original.id);
  assert.equal(wrapper.operands[1].value, 0);
});

test('non-associative operations reject gap insertion but allow explicit wrapping', () => {
  for (const [operation, setter, input] of [
    ['Add', setAdditionAssociative, 'a+b+c'],
    ['Multiply', setMultiplicationAssociative, 'a*b*c']
  ]) {
    const root = parseExpression(input);
    const parent = operation === 'Add' ? root : root.operands[0];
    setter(false);
    try {
      assert.equal(proposeIdentityInsertion(root, {operation, parentNodeId:parent.id, insertionIndex:1}), null);
      assert.ok(proposeIdentityInsertion(root, {operation, targetNodeId:parent.operands[0].id, side:'right'}));
    } finally { setter(true); }
  }
});

test('identity insertion works within equality without altering the opposite side', () => {
  const root = parseExpression('a+b=c');
  const right = structuredClone(root.right);
  const result = proposeIdentityInsertion(root, {operation:'Multiply', targetNodeId:root.left.operands[0].id, side:'left'});
  assert.deepEqual(result.root.right, right);
  assert.equal(result.root.left.operands[0].type, 'Multiply');
  assert.equal(result.root.left.operands[0].operands[0].value, 1);
});

test('invalid insertion requests are rejected without changing the source', () => {
  const root = parseExpression('a+b');
  const before = structuredClone(root);
  assert.equal(proposeIdentityInsertion(root, {operation:'Power',targetNodeId:root.operands[0].id,side:'left'}), null);
  assert.equal(proposeIdentityInsertion(root, {operation:'Add',parentNodeId:root.id,insertionIndex:0}), null);
  assert.equal(proposeIdentityInsertion(root, {operation:'Add',targetNodeId:'missing',side:'right'}), null);
  assert.deepEqual(root, before);
});
