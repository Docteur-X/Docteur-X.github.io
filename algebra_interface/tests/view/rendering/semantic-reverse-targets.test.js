import test from 'node:test';
import assert from 'node:assert/strict';
import { createSemanticTargetResolver } from '../../../js/view/rendering/semanticTargetResolver.js';
import { semanticInput } from '../../../js/view/semanticInput.js';

const root = { type: 'Add', id: 'sum', operands: [
  { type: 'Symbol', id: 'a', name: 'a' }, { type: 'Symbol', id: 'b', name: 'b' },
] };
function fixture() {
  let nodes = [];
  const view = { contains: node => nodes.includes(node), querySelectorAll: () => nodes };
  const resolver = createSemanticTargetResolver({ view, getRoot: () => root,
    getMathematicalObjectId: () => 'obj' });
  return { resolver, view, setNodes(value) { nodes = value; resolver.refresh(); }, detach(value) { nodes = nodes.filter(n => n !== value); } };
}
const el = (dataset, parentElement = null) => ({ dataset, parentElement });

test('reverse resolver addresses occurrence, content and indexed operator without DOM leakage', () => {
  const f = fixture();
  const a = el({ nodeId: 'a', hitboxRole: 'occurrence' });
  const content = el({ parentId: 'sum', hitboxRole: 'content' });
  const plus = el({ operatorOwnerId: 'sum', operatorIndex: '1' });
  f.setNodes([a, content, plus]);
  for (const [node, expected] of [[a,{nodeId:'a',role:'occurrence'}],
    [content,{nodeId:'sum',role:'content'}],
    [plus,{nodeId:'sum',role:'operator',operatorPosition:1}]]) {
    const address = f.resolver.addressFromElement(node, { mathematicalObjectId:'obj' });
    assert.deepEqual(address, { mathematicalObjectId:'obj', ...expected });
    assert.equal(Object.isFrozen(address), true);
    const input = semanticInput({ phase:'hover', method:'pointer', viewId:'v', objectId:'obj', target:address });
    assert.equal(input.target.nodeId, expected.nodeId);
  }
});

test('nested hitboxes choose nearest indexed ancestor and reject foreign or unindexed targets', () => {
  const f = fixture();
  const outer = el({ parentId:'sum', hitboxRole:'content' });
  const inner = el({ nodeId:'a', hitboxRole:'occurrence' }, outer);
  const child = el({}, inner);
  const unrelated = el({ nodeId:'b', hitboxRole:'unknown' });
  f.setNodes([outer,inner,child,unrelated]);
  assert.equal(f.resolver.addressFromElement(child,{mathematicalObjectId:'obj'}).nodeId,'a');
  assert.equal(f.resolver.addressFromElement(unrelated,{mathematicalObjectId:'obj'}),null);
  assert.equal(f.resolver.addressFromElement(inner,{mathematicalObjectId:'other'}),null);
  assert.equal(f.resolver.addressFromElement(el({nodeId:'a',hitboxRole:'occurrence'}),{mathematicalObjectId:'obj'}),null);
});

test('stale, detached and malformed operator elements fail closed', () => {
  const f = fixture();
  const old = el({nodeId:'a',hitboxRole:'occurrence'});
  const malformed = el({operatorOwnerId:'sum',operatorIndex:'1.5'});
  f.setNodes([old,malformed]);
  assert.equal(f.resolver.addressFromElement(malformed,{mathematicalObjectId:'obj'}),null);
  f.detach(old);
  assert.equal(f.resolver.addressFromElement(old,{mathematicalObjectId:'obj'}),null);
  const replacement = el({nodeId:'a',hitboxRole:'occurrence'});
  f.setNodes([replacement]);
  assert.equal(f.resolver.addressFromElement(old,{mathematicalObjectId:'obj'}),null);
  assert.equal(f.resolver.addressFromElement(replacement,{mathematicalObjectId:'obj'}).nodeId,'a');
});

test('reused DOM hitbox with changed identity fails closed until refresh', () => {
  const f = fixture();
  const reused = el({ nodeId:'a', hitboxRole:'occurrence' });
  f.setNodes([reused]);
  reused.dataset.nodeId = 'b';
  assert.equal(f.resolver.addressFromElement(reused,{mathematicalObjectId:'obj'}), null);
  assert.equal(f.resolver.resolve({mathematicalObjectId:'obj',nodeId:'a'}).element, null);
  f.resolver.refresh();
  assert.equal(f.resolver.addressFromElement(reused,{mathematicalObjectId:'obj'}).nodeId, 'b');
});

test('explicit invalidation rejects old addresses even before DOM replacement', () => {
  const f = fixture();
  const hitbox = el({nodeId:'a',hitboxRole:'occurrence'});
  f.setNodes([hitbox]);
  const before = f.resolver.getGeneration();
  f.resolver.invalidate();
  assert.ok(f.resolver.getGeneration() > before);
  assert.equal(f.resolver.addressFromElement(hitbox,{mathematicalObjectId:'obj'}),null);
  assert.equal(f.resolver.resolve({mathematicalObjectId:'obj',nodeId:'a'}).element,null);
  f.resolver.refresh();
  assert.equal(f.resolver.addressFromElement(hitbox,{mathematicalObjectId:'obj'}).nodeId,'a');
});

test('changed AST root or object identity rejects stale index', () => {
  let activeRoot = root;
  let objectId = 'obj';
  const hitbox = el({nodeId:'a',hitboxRole:'occurrence'});
  const view = { contains: node => node === hitbox, querySelectorAll: () => [hitbox] };
  const resolver = createSemanticTargetResolver({view,getRoot:()=>activeRoot,getMathematicalObjectId:()=>objectId});
  resolver.refresh();
  activeRoot = structuredClone(root);
  assert.equal(resolver.addressFromElement(hitbox,{mathematicalObjectId:'obj'}),null);
  resolver.refresh();
  assert.equal(resolver.addressFromElement(hitbox,{mathematicalObjectId:'obj'}).nodeId,'a');
  objectId = 'another';
  assert.equal(resolver.addressFromElement(hitbox,{mathematicalObjectId:'obj'}),null);
});

test('mutated nested hitbox cannot fall through to a valid outer target', () => {
  const f = fixture();
  const outer = el({parentId:'sum',hitboxRole:'content'});
  const inner = el({nodeId:'a',hitboxRole:'occurrence'},outer);
  f.setNodes([outer,inner]);
  inner.dataset.nodeId = 'b';
  assert.equal(f.resolver.addressFromElement(inner,{mathematicalObjectId:'obj'}),null);
});
