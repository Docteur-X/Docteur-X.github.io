import test from 'node:test';
import assert from 'node:assert/strict';
import { createSemanticTargetResolver } from '../../js/view/rendering/semanticTargetResolver.js';

// Minimal renderer metadata fixture: no browser layout, selector engine or
// fabricated AST wrappers. Geometry and hit-testing remain independent.
function element(dataset) { return { dataset }; }
function fixture(root, objectId = 'mob-A') {
  let nodes = [];
  const view = {
    querySelectorAll() { return nodes; },
    contains(node) { return nodes.includes(node); },
  };
  const resolver = createSemanticTargetResolver({ view, getRoot: () => root,
    getMathematicalObjectId: () => objectId });
  return { view, resolver, setNodes(next) { nodes = next; resolver.refresh(); } };
}
const leaf = (type, id) => ({ type, id, ...(type === 'Number' ? { value: 2 } : { name: 'x' }) });

test('Phase 2: root and nested Number/Symbol/Group have honest occurrence targets', () => {
  const root = { type: 'Group', id: 'g', operand: { type: 'Add', id: 'a', operands: [leaf('Number','n'), leaf('Symbol','s')] } };
  const f = fixture(root);
  const n = element({ nodeId: 'n', hitboxRole: 'occurrence' });
  const s = element({ nodeId: 's', hitboxRole: 'occurrence' });
  const g = element({ nodeId: 'g', hitboxRole: 'occurrence' });
  const content = element({ parentId: 'a', hitboxRole: 'content' });
  f.setNodes([n,s,g,content]);
  for (const [id, expected] of [['n',n],['s',s],['g',g]]) {
    const result = f.resolver.resolve({ mathematicalObjectId: 'mob-A', nodeId: id });
    assert.equal(result.outcome, 'found'); assert.equal(result.element, expected);
  }
  assert.equal(f.resolver.resolve({ mathematicalObjectId: 'mob-A', nodeId: 'a' }).outcome, 'content-only');
  assert.equal(f.resolver.describe('a').directlyTargetable, false);
  assert.equal(f.resolver.resolve({ mathematicalObjectId: 'mob-B', nodeId: 'n' }).outcome, 'unavailable');
});

test('Phase 2: Multiply/Negate/Equal and indexed plus operators do not invent hitboxes', () => {
  const root = { type: 'Equal', id: 'eq', left: { type: 'Add', id: 'add', operands: [leaf('Number','n1'),leaf('Number','n2'),leaf('Number','n3')] }, right: { type: 'Negate', id: 'neg', operand: { type: 'Multiply', id: 'mul', operands: [leaf('Symbol','x'),leaf('Symbol','y')] } } };
  const f = fixture(root);
  const plus0 = element({ operatorOwnerId: 'add', operatorIndex: '1' });
  const plus1 = element({ operatorOwnerId: 'add', operatorIndex: '2' });
  f.setNodes([plus0,plus1, element({ parentId: 'mul', hitboxRole: 'content' }),
    element({ parentId: 'neg', hitboxRole: 'content' }), element({ parentId: 'eq', hitboxRole: 'content' })]);
  assert.equal(f.resolver.resolve({ mathematicalObjectId:'mob-A', nodeId:'add' }).outcome, 'operator-only');
  assert.equal(f.resolver.resolve({ mathematicalObjectId:'mob-A', nodeId:'add', targetRole:'operator', operatorPosition:2 }).element, plus1);
  assert.equal(f.resolver.resolve({ mathematicalObjectId:'mob-A', nodeId:'add', targetRole:'occurrence' }).outcome, 'unavailable');
  for (const id of ['mul','neg','eq']) assert.equal(f.resolver.resolve({ mathematicalObjectId:'mob-A', nodeId:id }).outcome, 'content-only');
});

test('Phase 2: rerenders invalidate stale elements; two views cannot cross-resolve', () => {
  const root = leaf('Symbol','same');
  const a = fixture(root, 'mob'); const b = fixture(root, 'mob');
  const first = element({ nodeId:'same', hitboxRole:'occurrence' });
  const second = element({ nodeId:'same', hitboxRole:'occurrence' });
  a.setNodes([first]); b.setNodes([second]);
  assert.equal(a.resolver.resolve({ mathematicalObjectId:'mob', nodeId:'same' }).element, first);
  assert.equal(b.resolver.resolve({ mathematicalObjectId:'mob', nodeId:'same' }).element, second);
  a.setNodes([]);
  assert.equal(a.resolver.resolve({ mathematicalObjectId:'mob', nodeId:'same' }).outcome, 'unavailable');
  assert.equal(b.resolver.resolve({ mathematicalObjectId:'mob', nodeId:'same' }).element, second);
});

test('Phase 2: feedback accepts a semantic address without removing DOM compatibility', async () => {
  const { createVisualFeedbackController } = await import('../../js/view/visualFeedbackController.js');
  const classes = new Set();
  const el = { dataset: { nodeId: 's', hitboxRole: 'occurrence' },
    classList: { add: c => classes.add(c), remove: c => classes.delete(c) } };
  const f = fixture(leaf('Symbol', 's'));
  f.setNodes([el]);
  const feedback = createVisualFeedbackController(f.view, f.resolver);
  feedback.show('semantic', [{ mathematicalObjectId: 'mob-A', nodeId: 's', role: 'structure-navigation' }]);
  assert.equal(classes.has('is-structure-navigated'), true);
  feedback.show('legacy', [{ element: el, role: 'structure-navigation' }]);
  feedback.clear('semantic');
  assert.equal(classes.has('is-structure-navigated'), true);
  feedback.clear('legacy');
  assert.equal(classes.has('is-structure-navigated'), false);
  feedback.dispose();
});


test('Phase 2 hardening: mixed DOM/semantic feedback rejects mismatched targets atomically', async () => {
  const { createVisualFeedbackController } = await import('../../js/view/visualFeedbackController.js');
  const classes = new Set();
  const mk = id => ({ dataset: { nodeId: id, hitboxRole: 'occurrence' },
    classList: { add: c => classes.add(`${id}:${c}`), remove: c => classes.delete(`${id}:${c}`) } });
  const root = { type: 'Add', id: 'add', operands: [leaf('Symbol','a'), leaf('Symbol','b')] };
  const f = fixture(root);
  const a = mk('a'), b = mk('b');
  f.setNodes([a,b]);
  const feedback = createVisualFeedbackController(f.view, f.resolver);
  feedback.show('owner', [{ element:a, role:'selected' }]);
  assert.throws(() => feedback.show('owner', [{ element:b, mathematicalObjectId:'mob-A', nodeId:'a', role:'selected' }]));
  assert.throws(() => feedback.show('owner', [{ element:a, mathematicalObjectId:'mob-B', nodeId:'a', role:'selected' }]));
  assert.throws(() => feedback.show('owner', [{ element:a, nodeId:'a', role:'selected' }]));
  assert.equal(classes.has('a:math-feedback--selected'), true);
  assert.equal(classes.has('b:math-feedback--selected'), false);
  feedback.show('owner', [{ element:a, mathematicalObjectId:'mob-A', nodeId:'a', role:'selected' }]);
  feedback.dispose();
});

test('Phase 2 hardening: object switches, empty views and detached targets cannot leak', () => {
  let root = leaf('Symbol','same'), objectId = 'first', nodes = [];
  const view = { querySelectorAll: () => nodes, contains: node => nodes.includes(node) };
  const resolver = createSemanticTargetResolver({ view, getRoot: () => root, getMathematicalObjectId: () => objectId });
  const old = element({ nodeId:'same', hitboxRole:'occurrence' });
  nodes = [old]; resolver.refresh();
  assert.equal(resolver.resolve({ mathematicalObjectId:'first', nodeId:'same' }).element, old);
  nodes = []; // Detached before refresh must not resolve.
  assert.equal(resolver.resolve({ mathematicalObjectId:'first', nodeId:'same' }).outcome, 'unavailable');
  objectId = 'second'; root = null; resolver.refresh();
  assert.equal(resolver.resolve({ mathematicalObjectId:'first', nodeId:'same' }).outcome, 'unavailable');
  assert.equal(resolver.resolve({ mathematicalObjectId:'second', nodeId:'same' }).outcome, 'unavailable');
  root = leaf('Symbol','same');
  const replacement = element({ nodeId:'same', hitboxRole:'occurrence' });
  nodes = [replacement]; resolver.refresh();
  assert.equal(resolver.resolve({ mathematicalObjectId:'second', nodeId:'same' }).element, replacement);
  assert.equal(resolver.resolve({ mathematicalObjectId:'first', nodeId:'same' }).outcome, 'unavailable');
});

test('Phase 2: multiple semantic representations retain occurrence precedence and attached targets', () => {
  // One mathematical Add occurrence can have several renderer targets. The
  // resolver must retain all eligible elements without inventing AST nodes.
  const root = { type: 'Add', id: 'add-multi', operands: [
    leaf('Symbol', 'left'), leaf('Symbol', 'middle'), leaf('Symbol', 'right'),
  ] };
  const f = fixture(root);
  const first = element({ nodeId: 'add-multi', hitboxRole: 'occurrence' });
  const second = element({ nodeId: 'add-multi', hitboxRole: 'occurrence' });
  const content = element({ parentId: 'add-multi', hitboxRole: 'content' });
  const plusOne = element({ operatorOwnerId: 'add-multi', operatorIndex: '1' });
  const plusTwo = element({ operatorOwnerId: 'add-multi', operatorIndex: '2' });
  f.setNodes([first, content, plusOne, second, plusTwo]);

  const address = { mathematicalObjectId: 'mob-A', nodeId: 'add-multi' };
  const preferred = f.resolver.resolve(address);
  assert.equal(preferred.outcome, 'found');
  assert.equal(preferred.representation, 'occurrence');
  assert.equal(preferred.element, first);
  assert.deepEqual(preferred.elements, [first, second]);
  assert.deepEqual(f.resolver.resolve({ ...address, targetRole: 'occurrence' }).elements, [first, second]);
  assert.deepEqual(f.resolver.resolve({ ...address, targetRole: 'content' }).elements, [content]);
  assert.deepEqual(f.resolver.resolve({ ...address, targetRole: 'operator' }).elements, [plusOne, plusTwo]);
  const secondOperator = f.resolver.resolve({ ...address, targetRole: 'operator', operatorPosition: 2 });
  assert.equal(secondOperator.element, plusTwo);
  assert.deepEqual(secondOperator.elements, [plusTwo]);
  assert.equal(f.resolver.resolve({ ...address, targetRole: 'operator', operatorPosition: 3 }).outcome, 'unavailable');
  assert.equal(f.resolver.describe('add-multi').occurrenceTargets, 2);
  assert.equal(f.resolver.describe('add-multi').contentContainers, 1);
  assert.equal(f.resolver.describe('add-multi').operatorTargets, 2);

  // Detach without refreshing: a stale DOM reference must disappear from
  // both the selected element and the complete target collection.
  f.view.contains = node => node !== first && node !== plusOne &&
    [second, content, plusTwo].includes(node);
  const remaining = f.resolver.resolve(address);
  assert.equal(remaining.element, second);
  assert.deepEqual(remaining.elements, [second]);
  assert.equal(f.resolver.describe('add-multi').occurrenceTargets, 1);
  assert.deepEqual(f.resolver.resolve({ ...address, targetRole: 'operator' }).elements, [plusTwo]);
});
