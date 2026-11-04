/* Pure mathematical regression tests for factorisation.
 * The UI must NEVER be needed to prove the algebraic rewrite correct. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToInput } from '../js/core/parser.js';
import { findNodeById } from '../js/core/treeUtils.js';
import { structurallyEqual } from '../js/core/structuralEquality.js';
import { getFactorisationPlan, applyFactorisation } from '../js/operations/factorisation.js';
import { checkFactorisationTeachingPolicy } from '../js/teaching/factorisationPolicy.js';
import { setMultiplicationAssociative, setMultiplicationCommutative } from '../js/operations/multiplication.js';

function fixture(input, side='left') {
  const root = parseExpression(input);
  const group = root.operands[0];
  const sum = group.operand;
  const ids = sum.operands.map(product => product.operands[side==='left'?0:product.operands.length-1].id);
  return {root, group, sum, ids};
}

test('left extraction retains residual IDs and explicit Group/Add IDs', () => {
  const {root,group,sum,ids} = fixture('(a*b+a*c+a*d)');
  const residualIds = sum.operands.map(p=>p.operands[1].id);
  const snapshot=JSON.stringify(root);
  const plan=getFactorisationPlan(root,ids.slice().reverse());
  assert.equal(plan.direction,'left');
  assert.equal(JSON.stringify(root),snapshot);
  const result=applyFactorisation(root,plan);
  assert.ok(result);
  assert.equal(JSON.stringify(root),snapshot,'original tree unchanged until commit');
  assert.equal(result.root.operands[0].type,'Multiply');
  assert.equal(result.root.operands[0].operands[1].id,group.id);
  assert.equal(findNodeById(result.root,sum.id).id,sum.id);
  assert.deepEqual(findNodeById(result.root,sum.id).operands.map(n=>n.id),residualIds);
  assert.equal(result.provenance.originIdsByNewId[result.extractedFactorId].length,3);
  assert.ok(!ids.includes(result.extractedFactorId));
  assert.equal(expressionToInput(result.root),'a (b+c+d)');
});

test('right extraction preserves order even with commutativity disabled', () => {
  const {root,ids} = fixture('(b*a+c*a+d*a)','right');
  try {
    setMultiplicationCommutative(false);
    const plan=getFactorisationPlan(root,ids);
    assert.equal(plan.direction,'right');
    const result=applyFactorisation(root,plan);
    assert.equal(expressionToInput(result.root),'(b+c+d) a');
  } finally { setMultiplicationCommutative(true); }
});

test('factorisation is not a shortcut for commuting ab+ca', () => {
  const {root,sum} = fixture('(a*b+c*a)');
  assert.equal(getFactorisationPlan(root,[sum.operands[0].operands[0].id,sum.operands[1].operands[1].id]),null);
});

test('all direct addends must be Multiply nodes with explicit matching factors', () => {
  const root=parseExpression('(a*b+a)');
  const sum=root.operands[0].operand;
  assert.equal(getFactorisationPlan(root,[sum.operands[0].operands[0].id,sum.operands[1].id]),null);
  const ungrouped=parseExpression('a*b+a*c');
  const mathematicalPlan=getFactorisationPlan(ungrouped,ungrouped.operands.map(p=>p.operands[0].id));
  assert.ok(mathematicalPlan, 'mathematics is valid without brackets');
  assert.equal(checkFactorisationTeachingPolicy(ungrouped,mathematicalPlan).allowed,false, 'teaching mode requires a visible boundary');
});

test('compound common factors match structurally, ignoring IDs and bracket styles', () => {
  const {root,sum} = fixture('([a+b]*c+{a+b}*d)');
  const ids=sum.operands.map(p=>p.operands[0].id);
  assert.ok(structurallyEqual(sum.operands[0].operands[0],sum.operands[1].operands[0]));
  const plan=getFactorisationPlan(root,ids);
  assert.ok(plan);
  const result=applyFactorisation(root,plan);
  assert.ok(result);
  assert.equal(result.provenance.sourceFactorIds.length,2);
});

test('two-factor extraction works without associativity, longer products require it', () => {
  try {
    setMultiplicationAssociative(false);
    const short=fixture('(a*b+a*c)');
    assert.ok(getFactorisationPlan(short.root,short.ids));
    const long=fixture('(a*b*c+a*d*e)');
    assert.equal(getFactorisationPlan(long.root,long.ids),null);
  } finally {setMultiplicationAssociative(true);}
});

test('longer products retain residual order and product IDs', () => {
  const {root,sum,ids}=fixture('(a*b*c+a*d*e)');
  const products=sum.operands.map(n=>n.id);
  const result=applyFactorisation(root,getFactorisationPlan(root,ids));
  const residualSum=findNodeById(result.root,sum.id);
  assert.deepEqual(residualSum.operands.map(n=>n.id),products);
  assert.equal(expressionToInput(result.root),'a (b·c+d·e)');
});

test('stale plan is rejected atomically, no mutation', () => {
  const {root,ids}=fixture('(a*b+a*c)');
  const plan=getFactorisationPlan(root,ids);
  const before=JSON.stringify(root);
  assert.equal(applyFactorisation(root,{...plan,groupId:'stale'}),null);
  assert.equal(JSON.stringify(root),before);
});

test('factorisation is invariant under Ctrl+click order', () => {
  const {root,ids}=fixture('(a*b+a*c)');
  const plan=getFactorisationPlan(root,ids.slice().reverse());
  assert.deepEqual(plan.sourceFactorIds,ids);
});

test('nonmatching or middle factors do not match', () => {
  const a=fixture('(a*b+x*c)');
  assert.equal(getFactorisationPlan(a.root,a.ids),null);
  const b=fixture('(b*a*c+d*a*e)');
  const sum=b.sum;
  assert.equal(getFactorisationPlan(b.root,sum.operands.map(p=>p.operands[1].id)),null);
});

test('nested explicit groups use the outer visible group as extraction scope', () => {
  const root=parseExpression('([a*b+a*c])');
  const outer=root.operands[0];
  const inner=outer.operand;
  const sum=inner.operand;
  const ids=sum.operands.map(product=>product.operands[0].id);
  const plan=getFactorisationPlan(root,ids);
  assert.equal(plan.groupId,outer.id);
  const result=applyFactorisation(root,plan);
  assert.ok(result);
  assert.equal(findNodeById(result.root,inner.id).type,'Group');
});

test('full candidate retains neighbouring factor in (ba+ca+da)f', () => {
  // This is the regression expression from the screenshots: the OLD floating
  // amber result overlapped f. The mathematical candidate must contain f in
  // its normal Multiply context, not as an overlay element.
  const root = parseExpression('(b*a+c*a+d*a)*f');
  const original = JSON.stringify(root);
  const outerProduct = root.operands[0];
  const originalF = outerProduct.operands.at(-1);
  const sum = outerProduct.operands[0].operand;
  const ids = sum.operands.map(product => product.operands.at(-1).id);
  const plan = getFactorisationPlan(root, ids);
  assert.equal(plan?.direction, 'right');
  const candidate = applyFactorisation(root, plan);
  assert.ok(candidate);
  assert.equal(JSON.stringify(root), original, 'preview construction cannot change the original');
  assert.equal(findNodeById(candidate.root, originalF.id)?.name, 'f');
  assert.equal(expressionToInput(candidate.root), '(b+c+d) a·f');
  assert.equal(candidate.provenance.extractedFactorId, candidate.extractedFactorId);
});

test('factorisation candidate preserves unrelated outer addition terms', () => {
  const root = parseExpression('x+(a*b+a*c)+y');
  const oldX = root.operands[0].id;
  const oldY = root.operands.at(-1).id;
  const sum = root.operands[1].operand;
  const ids = sum.operands.map(product => product.operands[0].id);
  const candidate = applyFactorisation(root, getFactorisationPlan(root, ids));
  assert.ok(candidate);
  assert.equal(candidate.root.operands[0].id, oldX);
  assert.equal(candidate.root.operands.at(-1).id, oldY);
  assert.equal(expressionToInput(candidate.root), 'x+a (b+c)+y');
});


test('mandatory precedence parentheses satisfy visible-brackets teaching policy', () => {
  const root = parseExpression('(a*b+a*c)*f');
  // Remove the explicit wrapper while keeping the Add nested inside Multiply.
  // This simulates a student having a sum with mandatory, renderer-inserted brackets.
  const product = root.operands[0];
  const group = product.operands[0];
  product.operands[0] = group.operand;
  const sum = product.operands[0];
  const ids = sum.operands.map(p => p.operands[0].id);
  const plan = getFactorisationPlan(root, ids);
  assert.ok(plan);
  assert.equal(plan.groupId, null);
  assert.equal(plan.scopeNodeId, sum.id);
  assert.deepEqual(checkFactorisationTeachingPolicy(root,plan), {allowed:true,reason:'mandatory-parentheses'});
  assert.equal(checkFactorisationTeachingPolicy(root,plan,'explicit-group').allowed,false);
  const output=applyFactorisation(root,plan);
  assert.ok(output);
  assert.equal(expressionToInput(output.root),'a (b+c)·f');
  assert.equal(findNodeById(output.root,sum.id).id,sum.id);
});

test('policy modes are independent of mathematical factorisation', () => {
  const root = parseExpression('a*b+a*c');
  const ids=root.operands.map(p=>p.operands[0].id);
  const plan=getFactorisationPlan(root,ids);
  assert.ok(plan);
  assert.equal(checkFactorisationTeachingPolicy(root,plan).allowed,false);
  assert.equal(checkFactorisationTeachingPolicy(root,plan,'any-add').allowed,true);
  assert.ok(applyFactorisation(root,plan));
  const grouped=fixture('(a*b+a*c)');
  const groupedPlan=getFactorisationPlan(grouped.root,grouped.ids);
  assert.equal(checkFactorisationTeachingPolicy(grouped.root,groupedPlan,'explicit-group').allowed,true);
  assert.throws(()=>checkFactorisationTeachingPolicy(root,plan,'unknown'),RangeError);
});

test('selecting only two of three matching factors is mathematically rejected', () => {
  const {root,ids}=fixture('(a*b+a*c+a*d)');
  assert.equal(getFactorisationPlan(root,ids.slice(0,2)),null);
});
