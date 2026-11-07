import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../js/core/parser.js';
import { applyFunctionToEquality } from '../js/relations/equalityFunctionApplication.js';
import { equalityFunctionActionRequest } from '../js/manipulator/equalityFunctionGesture.js';
import { walkExpression } from '../js/core/treeUtils.js';

function ids(tree) { const out=[]; walkExpression(tree,n=>out.push(n.id)); return out; }

test('addition context preserves original side IDs and clones operand twice with unique IDs', () => {
  const equation = parseExpression('a=b');
  const operand = parseExpression('c+d');
  const before = structuredClone(equation), operandBefore = structuredClone(operand);
  const result = applyFunctionToEquality(equation, operand, 'add-right');
  assert.deepEqual(equation, before);
  assert.deepEqual(operand, operandBefore);
  assert.equal(result.root.id, equation.id);
  assert.equal(result.root.left.operands[0].id, equation.left.id);
  assert.equal(result.root.right.operands[0].id, equation.right.id);
  // A newly introduced compound addend is explicitly grouped, unlike the
  // pre-existing side. These are REAL Group AST nodes, not CSS parentheses.
  assert.equal(result.root.left.operands[1].type, 'Group');
  assert.equal(result.root.right.operands[1].type, 'Group');
  assert.equal(result.root.left.operands[1].operand.type, 'Add');
  assert.equal(result.root.right.operands[1].operand.type, 'Add');
  assert.deepEqual(result.visualRoles.insertedOperandIds, [
    result.root.left.operands[1].id, result.root.right.operands[1].id
  ]);
  assert.equal(new Set(ids(result.root)).size, ids(result.root).length);
  assert.equal(result.provenance.implication, 'forward');
});

test('left and right multiplication retain factor order, never claim reversible equivalence', () => {
  const eq = parseExpression('a=b'), c = parseExpression('c');
  const left = applyFunctionToEquality(eq,c,'multiply-left');
  const right = applyFunctionToEquality(eq,c,'multiply-right');
  assert.equal(left.root.left.operands[0].operands[0].name,'c');
  assert.equal(left.root.left.operands[1].operands[0].name,'a');
  assert.equal(right.root.left.operands[0].operands[0].name,'a');
  assert.equal(right.root.left.operands[1].operands[0].name,'c');
  assert.equal(left.provenance.equivalence,'not-established');
});

test('reject non-equality, unsupported contexts, and statement operands without mutation', () => {
  const eq = parseExpression('a=b'); const original = structuredClone(eq);
  assert.throws(()=>applyFunctionToEquality(parseExpression('a+c'),parseExpression('d'),'add-right'));
  assert.throws(()=>applyFunctionToEquality(eq,parseExpression('c=d'),'add-right'));
  assert.throws(()=>applyFunctionToEquality(eq,parseExpression('c'),'divide-right'));
  assert.deepEqual(eq,original);
});

test('gesture adapter records frozen intent, never mathematical implementation', () => {
  const action = equalityFunctionActionRequest({relationId:'node-1',context:'add-right',clipboardId:'clip-1',revision:'rev'});
  assert.equal(action.ruleId,'equality.apply-function');
  assert.equal(Object.isFrozen(action.parameters),true);
  assert.equal(equalityFunctionActionRequest({relationId:'node-1',context:'divide',clipboardId:'clip-1'}),null);
});

/** Grouping is deliberate only for a newly introduced sum. Multiplication
 * uses renderer precedence rules, so a+b receives mandatory parentheses
 * without manufacturing a user-removable Group in the mathematical AST. */
test('atomic addition stays ungrouped; multiplication preserves precedence and identities', () => {
  const eq = parseExpression('a+b=d');
  const atomic = applyFunctionToEquality(eq, parseExpression('c'), 'add-right');
  assert.notEqual(atomic.root.left.operands[1].type, 'Group');
  assert.equal(atomic.root.left.operands[0].id, eq.left.id);
  const compound = applyFunctionToEquality(eq, parseExpression('c+d'), 'multiply-right');
  assert.equal(compound.root.left.operands[0].id, eq.left.id);
  assert.equal(compound.root.left.operands[0].type, 'Add');
  assert.equal(compound.root.left.operands[1].type, 'Group');
  assert.equal(compound.root.left.operands[1].operand.type, 'Add');
  assert.equal(compound.visualRoles.insertedOperandIds.length, 2);
});

test('already grouped copied operand is not wrapped in a second Group', () => {
  const result = applyFunctionToEquality(parseExpression('a=b'), parseExpression('(c+d)'), 'add-right');
  const inserted = result.root.left.operands[1];
  assert.equal(inserted.type, 'Group');
  assert.equal(inserted.operand.type, 'Add');
  assert.equal(result.visualRoles.insertedOperandIds[0], inserted.id);
});

/** The optional teaching policy never changes the mathematical operation or
 * original node identities. A teacher may choose minimal explicit grouping;
 * mandatory precedence parentheses are still supplied by the renderer. */
test('teaching policy groups copied products by default and supports minimal grouping', () => {
  const equation = parseExpression('a+b=d');
  const operand = parseExpression('3yz');
  const grouped = applyFunctionToEquality(equation, operand, 'add-right');
  assert.equal(grouped.root.left.operands[1].type, 'Group');
  assert.equal(grouped.root.left.operands[1].operand.type, 'Multiply');
  assert.equal(grouped.root.left.operands[0].id, equation.left.id);
  const minimal = applyFunctionToEquality(equation, operand, 'add-right', {groupingPolicy:'minimal'});
  assert.equal(minimal.root.left.operands[1].type, 'Multiply');
  assert.equal(minimal.root.left.operands[0].id, equation.left.id);
  assert.throws(() => applyFunctionToEquality(equation, operand, 'add-right', {groupingPolicy:'invalid'}), RangeError);
});

test('multiplication groups introduced compound factor but not the original sum', () => {
  const equation = parseExpression('a+b=d');
  const applied = applyFunctionToEquality(equation, parseExpression('3yz'), 'multiply-right');
  assert.equal(applied.root.left.operands[0].id, equation.left.id);
  assert.equal(applied.root.left.operands[0].type, 'Add');
  assert.equal(applied.root.left.operands[1].type, 'Group');
  assert.equal(applied.root.left.operands[1].operand.type, 'Multiply');
  assert.equal(applied.root.right.operands[1].type, 'Group');
});
