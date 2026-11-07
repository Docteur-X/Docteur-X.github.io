/* ========================================================================== *
 * Interaction geometry and feedback regression tests (no browser dependency).
 * ========================================================================== *
 * Tests exercise the low-level modules with small fake DOM objects. Unlike
 * mathematical unit tests, these test POINTER TARGET PRIORITY and verify the
 * absence of layout modifications during hover. Full browser pointer tests
 * are still necessary to assess visuals, zoom, scrolling and touch behaviour.
 * ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HIT_TEST_OPTIONS, captureDragGeometry, hitTestDrag, hitTestVisibleInsertion, pointInsideRect, retainInsertionDuringTransition
} from '../js/interaction/hitTesting.js';
import { createDragFeedback } from '../js/interaction/dragFeedback.js';
import { createRearrangementPreview, proposedRearrangementOrder } from '../js/interaction/rearrangementPreview.js';

class FakeClassList {
  constructor(initial = '') { this.classes = new Set(initial.split(/\s+/).filter(Boolean)); }
  contains(name) { return this.classes.has(name); }
  add(...names) { names.forEach((name) => this.classes.add(name)); }
  remove(...names) { names.forEach((name) => this.classes.delete(name)); }
}
class FakeElement {
  constructor(className = '', dataset = {}, rect = [0, 0, 40, 40]) {
    this.classList = new FakeClassList(className);
    this.dataset = dataset;
    this.children = [];
    this.style = {};
    this.hidden = false;
    this.attributes = new Map();
    this.reads = 0;
    this._rect = rect;
  }
  getBoundingClientRect() {
    this.reads++;
    const [left, top, width, height] = this._rect;
    return { left, top, right: left + width, bottom: top + height, width, height };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = [...children]; }
  removeAttribute(key) { this.attributes.delete(key); }
  cloneNode(deep = false) {
    // Minimal clone of a real DOM element: children are NEW objects, never the
    // original mathematical hitboxes. Drag preview tests use this to verify
    // that proposing a new visual order leaves the original DOM untouched.
    const result = new FakeElement([...this.classList.classes].join(' '),
      { ...this.dataset }, [...this._rect]);
    result.attributes = new Map(this.attributes);
    if (deep) result.children = this.children.map((child) => child.cloneNode(true));
    return result;
  }
  querySelectorAll(selector) {
    const descendants = [];
    const visit = (node) => {
      for (const child of node.children) { descendants.push(child); visit(child); }
    };
    visit(this);
    if (selector === '[id]') return descendants.filter((child) => child.attributes.has('id'));
    if (selector === '[tabindex], button, input, a') return descendants.filter(
      (child) => child.attributes.has('tabindex'));
    if (selector.startsWith('.is-drag-source')) return descendants.filter((child) =>
      ['is-drag-source', 'is-combine-target', 'is-distribution-target']
        .some((name) => child.classList.contains(name)));
    return [];
  }
  contains(element) { return this === element || this.children.some((child) => child.contains?.(element)); }
  setAttribute(key, value) { this.attributes.set(key, value); }
  removeAttribute(key) { this.attributes.delete(key); }
  remove() { this.removed = true; }
}
function makeFixture() {
  const source = new FakeElement('factor-slot', { nodeId: 'a' }, [10, 10, 40, 40]);
  const target = new FakeElement('factor-slot', { nodeId: 'sum' }, [70, 10, 100, 40]);
  const last = new FakeElement('factor-slot', { nodeId: 'c' }, [190, 10, 40, 40]);
  const plus = new FakeElement('plus', { sumId: 'inner-sum' }, [106, 16, 18, 25]);
  target.append(plus); // A plus sign nested INSIDE a sibling's hitbox.
  const container = new FakeElement('drag-container', { parentId: 'product' }, [0, 0, 240, 60]);
  container.append(source); container.append(target); container.append(last);
  const equation = new FakeElement('equation', {}, [0, 0, 290, 80]);
  equation.querySelectorAll = (selector) => selector === '.drag-container'
    ? [container] : selector === '.plus[data-sum-id]' ? [plus] : [];
  return { source, target, last, plus, container, equation };
}

const noCombine = () => false;

test('geometry snapshots retain the original source operand without changing the DOM', () => {
  const fixture = makeFixture();
  const originalChildren = [...fixture.container.children];
  const geometry = captureDragGeometry(fixture.equation, 'product', 'Multiply', 'a', ['inner-sum']);
  assert.ok(geometry);
  assert.deepEqual(fixture.container.children, originalChildren);
  assert.deepEqual(geometry.siblings.map((sibling) => sibling.nodeId), ['a', 'sum', 'c']);
  assert.equal(geometry.plusSigns[0].sumId, 'inner-sum');
});

test('yellow plus signs have higher priority than compatible green hitboxes', () => {
  const f = makeFixture();
  const geometry = captureDragGeometry(f.equation, 'product', 'Multiply', 'a', ['inner-sum']);
  assert.equal(hitTestDrag(geometry, 115, 25, () => true).kind, 'distribution');
  const green = hitTestDrag(geometry, 85, 25, (id) => id === 'sum');
  assert.equal(green.kind, 'combine');
  assert.equal(green.id, 'sum');
});

test('ineligible sibling centres refuse drops while their thin edges offer insertion', () => {
  const f = makeFixture();
  const geometry = captureDragGeometry(f.equation, 'product', 'Multiply', 'a', []);
  assert.equal(hitTestDrag(geometry, 140, 25, noCombine).kind, 'invalid');
  assert.deepEqual(
    { kind: hitTestDrag(geometry, 73, 25, noCombine).kind,
      index: hitTestDrag(geometry, 73, 25, noCombine).index },
    { kind: 'insert', index: 0 }
  );
  const middle = hitTestDrag(geometry, 180, 25, noCombine);
  assert.equal(middle.kind, 'insert');
  assert.equal(middle.index, 1);
  assert.equal(hitTestDrag(geometry, 450, 25, noCombine).kind, 'none');
});

test('cached rectangles cannot be displaced by painting or later DOM measurements', () => {
  const f = makeFixture();
  const geometry = captureDragGeometry(f.equation, 'product', 'Multiply', 'a', []);
  const reads = f.target.reads;
  f.target._rect = [900, 900, 100, 40]; // Simulate a visual layout change.
  f.target.classList.add('is-combine-target');
  assert.equal(hitTestDrag(geometry, 85, 25, () => true).kind, 'combine');
  assert.equal(f.target.reads, reads, 'pointer testing never remeasures targets');
});

test('hysteresis exists as a future option but is disabled by default', () => {
  assert.equal(HIT_TEST_OPTIONS.hysteresisEnabled, false);
  const f = makeFixture();
  const geometry = captureDragGeometry(f.equation, 'product', 'Multiply', 'a', []);
  const previous = { kind: 'combine', id: 'sum' };
  assert.equal(hitTestDrag(geometry, 173, 25, () => true, previous).kind, 'insert');
  const enabled = { ...HIT_TEST_OPTIONS, hysteresisEnabled: true, hysteresisPixels: 12 };
  assert.equal(hitTestDrag(geometry, 173, 25, () => true, previous, enabled).kind, 'combine');
  assert.ok(pointInsideRect(0, 0, { left: 0, right: 10, top: 0, bottom: 10 }));
});

test('dragFeedback changes only classes and fixed overlay, never equation children', () => {
  const fixture = makeFixture();
  const body = new FakeElement();
  const doc = { body, createElement: () => new FakeElement() };
  const feedback = createDragFeedback(doc);
  const originalChildren = [...fixture.container.children];
  const geometry = captureDragGeometry(fixture.equation, 'product', 'Multiply', 'a', ['inner-sum']);
  const ghost = new FakeElement('drag-ghost');
  feedback.start(fixture.source, ghost);
  assert.ok(fixture.source.classList.contains('is-drag-source'));
  feedback.show(hitTestDrag(geometry, 115, 25, noCombine), geometry);
  assert.ok(fixture.plus.classList.contains('plus--distribution-drop'));
  assert.ok(fixture.target.classList.contains('is-distribution-target'));
  feedback.show(hitTestDrag(geometry, 85, 25, () => true), geometry);
  assert.ok(!fixture.plus.classList.contains('plus--distribution-drop'));
  assert.ok(fixture.target.classList.contains('is-combine-target'));
  feedback.show(hitTestDrag(geometry, 180, 25, noCombine), geometry);
  assert.ok(!fixture.target.classList.contains('is-combine-target'));
  assert.deepEqual(fixture.container.children, originalChildren);
  feedback.stop();
  assert.ok(!fixture.source.classList.contains('is-drag-source'));
  feedback.dispose();
  assert.ok(body.children[0].removed);
});

test('wrapped equations use the nearest visual row when finding insertion positions', () => {
  const f = makeFixture();
  // Simulate a narrow viewport: two middle operands fall on a second row.
  // The mathematical order is still a,b,c,d,e despite the 2-D wrapping.
  const a = new FakeElement('add-operand', { nodeId: 'a' }, [10, 10, 40, 40]);
  const b = new FakeElement('add-operand', { nodeId: 'b' }, [70, 10, 40, 40]);
  const c = new FakeElement('add-operand', { nodeId: 'c' }, [10, 75, 40, 40]);
  const d = new FakeElement('add-operand', { nodeId: 'd' }, [70, 75, 40, 40]);
  f.container = new FakeElement('drag-container', { parentId: 'sum' }, [0, 0, 160, 130]);
  f.equation = new FakeElement('equation', {}, [0, 0, 180, 150]);
  f.container.append(a); f.container.append(b); f.container.append(c); f.container.append(d);
  f.equation.querySelectorAll = (selector) => selector === '.drag-container' ? [f.container] : [];
  const geometry = captureDragGeometry(f.equation, 'sum', 'Add', 'a');
  // On the lower row, the gap between c and d is index 2 with 'a' omitted.
  const choice = hitTestDrag(geometry, 61, 95, noCombine);
  assert.equal(choice.kind, 'insert');
  assert.equal(choice.index, 2);
  assert.ok(choice.marker.top >= 70, 'marker stays on the chosen visual row');
});


// ========================================================================
// Expressive insertion preview: clone order and operator semantics.
// ========================================================================

test('proposedRearrangementOrder uses indices with the source omitted', () => {
  const ids = ['a', 'b', 'c', 'd'];
  assert.deepEqual(proposedRearrangementOrder(ids, 'a', 1), ['b', 'a', 'c', 'd']);
  assert.deepEqual(proposedRearrangementOrder(ids, 'd', 0), ['d', 'a', 'b', 'c']);
  assert.deepEqual(proposedRearrangementOrder(ids, 'a', 0), ids);
  assert.equal(proposedRearrangementOrder(ids, 'unknown', 1), null);
  assert.equal(proposedRearrangementOrder(ids, 'a', 4), null);
  assert.deepEqual(ids, ['a', 'b', 'c', 'd'], 'helper does not mutate inputs');
});

function makePreviewFixture(parentType = 'Add') {
  // A realistic renderer sequence alternates direct operand hitboxes and
  // operator signs: a + b + c or a · b · c.
  const kind = parentType === 'Add' ? 'add-operand' : 'factor-slot';
  const operatorKind = parentType === 'Add' ? 'plus' : 'multiply-operator';
  const a = new FakeElement(kind, { nodeId: 'a' }, [10, 20, 30, 40]);
  const b = new FakeElement(kind, { nodeId: 'b' }, [55, 20, 30, 40]);
  const c = new FakeElement(kind, { nodeId: 'c' }, [100, 20, 30, 40]);
  const operator1 = new FakeElement(operatorKind, {}, [45, 20, 10, 40]);
  const operator2 = new FakeElement(operatorKind, {}, [90, 20, 10, 40]);
  const container = new FakeElement('drag-container', { parentId: 'root' }, [0, 20, 150, 50]);
  container.append(a, operator1, b, operator2, c);
  const body = new FakeElement('body');
  const doc = { body, createElement: () => new FakeElement() };
  const geometry = {
    containerElement: container, parentType, sourceNodeId: 'a',
    siblings: [a, b, c].map((element) => ({ nodeId: element.dataset.nodeId, element, rect: element.getBoundingClientRect() })),
    containerRect: { left: 0, top: 20, width: 150, height: 50 }
  };
  return { a, b, c, container, body, doc, geometry, originalChildren: [...container.children] };
}

test('visual Add preview displays b + a + c without changing real hitboxes', () => {
  const fixture = makePreviewFixture('Add');
  const preview = createRearrangementPreview(fixture.doc);
  assert.equal(preview.show(1, fixture.geometry), true);
  const layer = fixture.body.children.at(-1);
  assert.ok(layer.classList.contains('drag-rearrangement-preview'));
  assert.ok(fixture.container.classList.contains('is-preview-covered'));
  assert.notEqual(layer, fixture.container, 'preview is a distinct clone');
  assert.deepEqual(layer.children.map((child) => child.dataset.nodeId || '+'),
    ['b', '+', 'a', '+', 'c']);
  assert.ok(layer.children[2].classList.contains('is-preview-moving'));
  assert.deepEqual(fixture.container.children, fixture.originalChildren);
  assert.equal(fixture.a.classList.contains('is-preview-moving'), false);
  assert.equal(layer.attributes.get('aria-hidden'), 'true');
  assert.equal(layer.attributes.get('inert'), '');
  preview.stop();
  assert.equal(layer.removed, true);
  assert.equal(fixture.container.classList.contains('is-preview-covered'), false);
  assert.deepEqual(fixture.container.children, fixture.originalChildren);
});

test('visual Multiply preview retains operator elements and reuses one overlay', () => {
  const fixture = makePreviewFixture('Multiply');
  const preview = createRearrangementPreview(fixture.doc);
  assert.equal(preview.show(2, fixture.geometry), true);
  const layer = fixture.body.children.at(-1);
  assert.deepEqual(layer.children.map((child) => child.dataset.nodeId || 'dot'),
    ['b', 'dot', 'c', 'dot', 'a']);
  assert.equal(preview.show(1, fixture.geometry), true);
  assert.equal(fixture.body.children.at(-1), layer, 'one overlay per drag session');
  assert.deepEqual(layer.children.map((child) => child.dataset.nodeId || 'dot'),
    ['b', 'dot', 'a', 'dot', 'c']);
  preview.stop();
});

test('invalid and numeric hover dismiss preview without changing the real tree DOM', () => {
  const fixture = makePreviewFixture('Add');
  const feedback = createDragFeedback(fixture.doc);
  feedback.start(fixture.a, new FakeElement('drag-ghost'));
  feedback.show({ kind: 'insert', index: 1, marker: { x: 45, top: 20, height: 40 } }, fixture.geometry);
  assert.ok(fixture.container.classList.contains('is-preview-covered'));
  feedback.show({ kind: 'none' }, fixture.geometry);
  assert.ok(!fixture.container.classList.contains('is-preview-covered'));
  assert.deepEqual(fixture.container.children, fixture.originalChildren);
  feedback.stop();
});

test('no-op insertion does not create history or alter ordered mathematical IDs', () => {
  // Interaction helper alone has no access to any history/tree state. A
  // source left in its existing index should reproduce the original order.
  const order = ['a', 'b', 'c'];
  assert.deepEqual(proposedRearrangementOrder(order, 'b', 1), order);
});


// ========================================================================
// Deliberate, non-interruptible preview transitions (browser animation mock).
// ========================================================================

/**
 * Fake Web Animations API with manually-controlled completion. This lets us
 * reproduce rapid pointer changes without depending on real time or a browser.
 * Reordered cloned children receive new fake rectangles, as a browser's
 * layout engine would do after rearranging the DOM children.
 */
function makeAnimatedPreviewFixture() {
  const fixture = makePreviewFixture('Add');
  const animations = [];
  const cloneBase = fixture.container.cloneNode.bind(fixture.container);
  fixture.container.cloneNode = (deep) => {
    const clone = cloneBase(deep);
    const all = [...clone.children];
    for (const child of all) {
      child.animate = () => {
        let resolve;
        const finished = new Promise((done) => { resolve = done; });
        const animation = { finished, cancel: resolve, resolve };
        animations.push(animation);
        return animation;
      };
    }
    clone.replaceChildren = (...children) => {
      clone.children = [...children];
      let index = 0;
      for (const child of children) {
        if (child.dataset.nodeId) {
          child._rect = [10 + 45 * index, 20, 30, 40];
          index++;
        }
      }
    };
    return clone;
  };
  return { ...fixture, animations };
}

const settleMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

test('visual hit testing uses the settled moving destination and visible sibling order', () => {
  const snapshot = {
    index: 1,
    movingRect: {left: 80, right: 110, top: 20, bottom: 60},
    siblings: [
      {nodeId:'b', rect:{left: 20, right: 50, top:20, bottom:60, height:40}},
      {nodeId:'c', rect:{left: 130, right:160, top:20, bottom:60, height:40}}
    ],
    containerRect: {left:20, right:160, top:20, bottom:60}
  };
  assert.equal(hitTestVisibleInsertion(snapshot, 93, 40).index, 1,
    'visible source is a drop target at the actual proposed index');
  assert.equal(hitTestVisibleInsertion(snapshot, 25, 40).index, 0);
  assert.equal(hitTestVisibleInsertion(snapshot, 155, 40).index, 2);
  assert.equal(hitTestVisibleInsertion(snapshot, 400, 40), null);
});

test('rapid reorder requests queue newest outcome without cancelling ongoing animation', async () => {
  const f = makeAnimatedPreviewFixture();
  let notifications = 0;
  const preview = createRearrangementPreview(f.doc, () => { notifications++; });
  assert.equal(preview.show(1, f.geometry), true);
  const layer = f.body.children.at(-1);
  assert.equal(preview.getPhase(), 'transitioning');
  assert.deepEqual(layer.children.map((child) => child.dataset.nodeId || '+'),
    ['b', '+', 'a', '+', 'c']);
  const first = [...f.animations];
  preview.show(0, f.geometry);
  preview.show(2, f.geometry); // latest requested destination should win
  assert.deepEqual(layer.children.map((child) => child.dataset.nodeId || '+'),
    ['b', '+', 'a', '+', 'c'], 'an in-flight transition is not interrupted');
  assert.equal(preview.getVisualGeometry(), null, 'no hit testing on moving frames');
  assert.ok(first.every((animation) => !animation.cancelled));
  first.forEach((animation) => animation.resolve());
  await settleMicrotasks();
  assert.equal(preview.getPhase(), 'transitioning');
  assert.deepEqual(layer.children.map((child) => child.dataset.nodeId || '+'),
    ['b', '+', 'c', '+', 'a'], 'only the most recent request is now animated');
  assert.equal(preview.isSettledAt(2), false);
  f.animations.slice(first.length).forEach((animation) => animation.resolve());
  await settleMicrotasks();
  assert.equal(preview.getPhase(), 'active');
  assert.equal(preview.isSettledAt(2), true);
  assert.ok(preview.getVisualGeometry(), 'settled geometry becomes available');
  assert.equal(notifications, 1);
  preview.stop();
  assert.equal(f.container.classList.contains('is-preview-covered'), false);
});

test('leaving during a transition waits, then returns before restoring the real DOM', async () => {
  const f = makeAnimatedPreviewFixture();
  const preview = createRearrangementPreview(f.doc);
  preview.show(2, f.geometry);
  const overlay = f.body.children.at(-1);
  const first = [...f.animations];
  preview.dismiss();
  assert.equal(preview.getPhase(), 'transitioning');
  assert.equal(overlay.removed, undefined);
  first.forEach((animation) => animation.resolve());
  await settleMicrotasks();
  assert.equal(preview.getPhase(), 'returning');
  assert.equal(f.container.classList.contains('is-preview-covered'), true);
  f.animations.slice(first.length).forEach((animation) => animation.resolve());
  await settleMicrotasks();
  assert.equal(preview.getPhase(), 'idle');
  assert.equal(overlay.removed, true);
  assert.equal(f.container.classList.contains('is-preview-covered'), false);
});

test('drag feedback refuses an unseen queued insertion and hard-stop cancels it safely', () => {
  const f = makeAnimatedPreviewFixture();
  const feedback = createDragFeedback(f.doc);
  feedback.start(f.a, new FakeElement('drag-ghost'));
  const proposal = { kind:'insert', id:'1', index:1,
    marker:{x:65,top:20,height:40} };
  assert.equal(feedback.show(proposal, f.geometry).kind, 'none',
    'release during an unfinished animation must not commit');
  assert.equal(f.container.classList.contains('is-preview-covered'), true);
  feedback.stop();
  assert.equal(f.container.classList.contains('is-preview-covered'), false);
  assert.equal(f.a.classList.contains('is-drag-source'), false);
});

test('visible preview still offers green combination and amber distribution targets', () => {
  const originalSibling = {nodeId:'b', element: new FakeElement('add-operand'),
    rect:{left:20,right:50,top:20,bottom:60}};
  const originalPlus = {sumId:'inner', element: new FakeElement('plus')};
  const snapshot = {
    index: 1,
    movingRect: {left:80,right:110,top:20,bottom:60},
    siblings: [{nodeId:'b', rect:{left:20,right:50,top:20,bottom:60}},
      {nodeId:'c',rect:{left:130,right:160,top:20,bottom:60}}],
    plusSigns:[{sumId:'inner',rect:{left:132,right:145,top:27,bottom:44}}],
    containerRect:{left:20,right:160,top:20,bottom:60}
  };
  const original = {siblings:[originalSibling],plusSigns:[originalPlus]};
  const combination = hitTestVisibleInsertion(snapshot, 35, 40,
    (id) => id === 'b', original);
  assert.equal(combination.kind, 'combine');
  assert.equal(combination.sibling, originalSibling,
    'feedback uses original real DOM reference, not inert clone');
  const distribution = hitTestVisibleInsertion(snapshot, 137, 35,
    () => true, original);
  assert.equal(distribution.kind, 'distribution',
    'amber plus takes priority over green and blue');
  assert.equal(distribution.plus, originalPlus);
});


test('a settled preview retains its destination over the middle of another displayed term', () => {
  const snapshot = {
    index: 1,
    movingRect: {left:80,right:110,top:20,bottom:60},
    siblings: [
      {nodeId:'b',rect:{left:20,right:50,top:20,bottom:60,height:40}},
      {nodeId:'c',rect:{left:130,right:160,top:20,bottom:60,height:40}}
    ],
    containerRect: {left:20,right:160,top:20,bottom:60}
  };
  assert.equal(hitTestVisibleInsertion(snapshot, 35, 40).index, 1,
    'hovering over b itself must not request a+b+c again');
  assert.equal(hitTestVisibleInsertion(snapshot, 145, 40).index, 1,
    'hovering over c itself must not request a new destination');
  assert.equal(hitTestVisibleInsertion(snapshot, 25, 40).index, 0,
    'moving deliberately to the left edge still changes destination');
});

test('a transition owns its destination until settled, without hiding explicit operations', () => {
  const base = {phase:'transitioning',previous:{kind:'insert',id:'1',index:1},
    startIndex:0,containerRect:{left:10,right:200,top:10,bottom:70},x:80,y:40};
  assert.equal(retainInsertionDuringTransition({...base,candidate:{kind:'insert',index:0}}).index,1);
  assert.equal(retainInsertionDuringTransition({...base,candidate:{kind:'invalid'}}).index,1);
  assert.equal(retainInsertionDuringTransition({...base,candidate:{kind:'insert',index:2}}).index,2);
  assert.equal(retainInsertionDuringTransition({...base,candidate:{kind:'combine',id:'b'}}).kind,'combine');
  assert.equal(retainInsertionDuringTransition({...base,candidate:{kind:'none'},x:300}).kind,'none');
  assert.equal(retainInsertionDuringTransition({...base,candidate:{kind:'insert',index:0},phase:'active'}).index,0);
});

/**
 * Regression: a valid semantic compression target is not a blue insertion.
 * A still-animating rearrangement clone must never veto its confirmation.
 * The feedback controller can clear that decorative clone, but it cannot
 * decide mathematical eligibility or publish history.
 */
test('negation compression supersedes an unsettled rearrangement preview', () => {
  const f = makeAnimatedPreviewFixture();
  const feedback = createDragFeedback(f.doc);
  feedback.start(f.a, new FakeElement('drag-ghost'));
  const insertion = { kind: 'insert', index: 1,
    marker: { x: 65, top: 20, height: 40 } };
  assert.equal(feedback.show(insertion, f.geometry).kind, 'none');
  assert.equal(f.container.classList.contains('is-preview-covered'), true);
  const compression = { kind: 'negation-compress', id: 'group-target' };
  assert.deepEqual(feedback.show(compression, f.geometry), compression);
  assert.equal(f.container.classList.contains('is-preview-covered'), false,
    'decorative rearrangement must be removed before compression');
  assert.equal(feedback.rearrangementPhase(), 'idle');
  feedback.stop();
});
