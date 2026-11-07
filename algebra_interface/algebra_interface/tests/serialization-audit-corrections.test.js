import test from 'node:test';
import assert from 'node:assert/strict';
import { assertAstInvariants, assertPatchInvariants } from '../js/core/documentInvariants.js';
import { assertBoundedJson } from '../js/core/serializationLimits.js';
import { createDocumentHistory, appendHistoryState, exportEventHistory, hydrateHistorySnapshots } from '../js/core/documentHistory.js';
import { parseExpression } from '../js/core/parser.js';

test('AST audit rejects deeply nested but otherwise structurally valid groups', () => {
  let root = {id:'leaf',type:'Symbol',name:'x'};
  for (let i=0;i<140;i++) root={id:`group-${i}`,type:'Group',bracketStyle:'round',operand:root};
  assert.throws(() => assertAstInvariants(root), /depth|limit/i);
});

test('JSON boundary rejects getters and symbol-keyed properties without executing getters', () => {
  let called=false;
  const payload={};
  Object.defineProperty(payload,'x',{enumerable:true,get(){called=true;throw Error('executed');}});
  assert.throws(() => assertBoundedJson(payload), /plain JSON/);
  assert.equal(called,false);
  assert.throws(() => assertBoundedJson({[Symbol('hidden')]:1}), /plain JSON/);
});

test('patch audit refuses excessive array indexes', () => {
  assert.throws(() => assertPatchInvariants([{op:'set',path:['expression','operands',999999999],value:1}]), /patch/);
});

test('hydration rejects array expansion and sparse-array deletion', () => {
  const h=createDocumentHistory();
  appendHistoryState(h,{expression:parseExpression('a+b'),substitutions:{}},{actionLabel:'Initial'});
  appendHistoryState(h,{expression:parseExpression('a+b'),substitutions:{x:1}},{actionLabel:'Next'});
  const c=exportEventHistory(h);
  const event=c.nodes[1].event;
  event.patch=[{op:'set',path:['expression','operands',999],value:{id:'z',type:'Symbol',name:'z'}}];
  assert.throws(() => hydrateHistorySnapshots(c), /array operation/);
  event.patch=[{op:'remove',path:['expression','operands',0]}];
  assert.throws(() => hydrateHistorySnapshots(c), /array operation/);
});
