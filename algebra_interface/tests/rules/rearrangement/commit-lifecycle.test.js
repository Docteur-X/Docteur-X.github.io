import test from 'node:test';
import assert from 'node:assert/strict';
import { createSymbol, createAdd, createMultiply } from '../../../js/engine/nodeFactory.js';
import { rearrangementActionRequest } from '../../../js/rules/rearrangement/gesture.js';
import { proposeRearrangement } from '../../../js/rules/rearrangement/propose.js';
import { prepareRearrangementCommitCandidate } from '../../../js/rules/rearrangement/commitCandidate.js';
import { createTransformationCommitLifecycle } from '../../../js/steps/transformationCommitLifecycle.js';
import { createDocumentHistory } from '../../../js/documents/documentHistory.js';
import { prepareAtomicTransformationCommit } from '../../../js/steps/atomicTransformationCommit.js';

const stamp = { documentId:'d', objectId:'o', revision:0, rootId:'root', fingerprint:'unchanged' };
for (const [type, factory] of [['Add', createAdd], ['Multiply', createMultiply]]) {
  test(`${type} rearrangement uses a detached, single-use, atomic commit`, () => {
    const nodes = ['a','b','c'].map(createSymbol);
    const root = factory(nodes);
    const before = JSON.stringify(root);
    const action = rearrangementActionRequest({parentId:root.id,parentType:type,draggedNodeId:nodes[0].id,destinationIndex:2});
    const candidate = { action, result: proposeRearrangement(root,action.parameters) };
    const proposed = prepareRearrangementCommitCandidate(root,candidate);
    assert.equal(JSON.stringify(root),before);
    assert.deepEqual(proposed.result.root.operands.map(x=>x.id),[nodes[1].id,nodes[2].id,nodes[0].id]);
    const gate = createTransformationCommitLifecycle();
    assert.equal(gate.open(proposed,stamp),true);
    assert.equal(gate.confirm({...stamp,revision:1},()=>assert.fail('stale committed')).status,'stale');
    assert.equal(JSON.stringify(root),before);
    assert.equal(gate.open(proposed,stamp),true);
    const history = createDocumentHistory({expression:root,substitutions:{}});
    let published;
    assert.equal(gate.confirm(stamp,p=>{
      published=prepareAtomicTransformationCommit({history,resultRoot:p.result.root,substitutions:{},actionLabel:'Reordered'});
    }).status,'committed');
    assert.equal(gate.confirm(stamp,()=>assert.fail('double commit')).status,'absent');
    assert.equal(JSON.stringify(root),before);
    assert.deepEqual(published.root.operands.map(x=>x.id),[nodes[1].id,nodes[2].id,nodes[0].id]);
  });
}

test('cancel, invalid and no-op rearrangement do not commit',()=>{
  const [a,b] = ['a','b'].map(createSymbol);
  const root = createAdd([a,b]);
  const action = rearrangementActionRequest({parentId:root.id,parentType:'Add',draggedNodeId:a.id,destinationIndex:0});
  assert.equal(prepareRearrangementCommitCandidate(root,{action,result:proposeRearrangement(root,action.parameters)}),null);
  const gate=createTransformationCommitLifecycle();
  gate.cancel();
  assert.equal(gate.confirm(stamp,()=>assert.fail('cancelled committed')).status,'absent');
});
