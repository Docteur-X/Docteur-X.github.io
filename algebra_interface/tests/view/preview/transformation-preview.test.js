/* ========================================================================== *
 * Tests for the generic full-expression transformation preview.
 *
 * These use a tiny fake DOM, not a browser layout engine. They verify the
 * invariants that are easy to regress: unchanged original DOM until preview,
 * full candidate replacement, an accessible amber confirmation target,
 * cancellation restoring the SAME DOM objects, and provenance arrows that
 * cannot participate in hit-testing. Real visual QA is still required.
 * ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransformationPreview } from '../../../js/view/preview/transformationPreview.js';

class FakeClasses {
  constructor() { this.items = new Set(); }
  add(...items) { items.forEach(item => this.items.add(item)); }
  contains(item) { return this.items.has(item); }
}
class FakeElement {
  constructor(tag = 'div', rect = {left:0,top:0,width:100,height:40}) {
    this.tagName = tag; this.rect = rect; this.children = []; this.style = {};
    this.dataset = {}; this.classList = new FakeClasses(); this.listeners = {};
    this.attributes = {}; this.parent = null;
  }
  set className(value) { this.classList.items = new Set(String(value).split(/\s+/).filter(Boolean)); }
  get className() { return [...this.classList.items].join(' '); }
  append(...elements) { elements.forEach(el => { if (el.parent) el.remove(); el.parent = this; this.children.push(el); }); }
  get parentNode() { return this.parent; }
  get nextSibling() {
    if (!this.parent) return null;
    return this.parent.children[this.parent.children.indexOf(this)+1] || null;
  }
  insertBefore(element, reference) {
    if (element.parent) element.remove();
    const index = reference ? this.children.indexOf(reference) : -1;
    element.parent = this;
    if (index < 0) this.children.push(element);
    else this.children.splice(index, 0, element);
  }
  replaceChildren(...elements) { this.children = []; this.append(...elements); }
  get childNodes() { return this.children; }
  get firstElementChild() { return this.children[0] || null; }
  querySelectorAll(selector) {
    const found = [];
    const walk = node => {
      for (const child of node.children) {
        if (selector === '[data-node-id]' && child.dataset.nodeId) found.push(child);
        if (selector === '[tabindex]' && child.attributes.tabindex !== undefined) found.push(child);
        walk(child);
      }
    };
    walk(this); return found;
  }
  getBoundingClientRect() { return {...this.rect,right:this.rect.left+this.rect.width,bottom:this.rect.top+this.rect.height}; }
  cloneNode(deep) {
    const copy = new FakeElement(this.tagName,{...this.rect});
    copy.dataset = {...this.dataset};
    copy.classList.items = new Set(this.classList.items);
    copy.attributes = {...this.attributes};
    if (deep) copy.append(...this.children.map(child => child.cloneNode(true)));
    return copy;
  }
  setAttribute(name,value) { this.attributes[name] = value; }
  addEventListener(name,callback) { this.listeners[name] = callback; }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter(c=>c!==this);
    this.parent = null;
  }
}
function fixture() {
  const document = {
    body: new FakeElement('body'),
    createElement: tag => new FakeElement(tag),
    createElementNS: (_,tag) => new FakeElement(tag)
  };
  const equation = new FakeElement('section');
  const oldRoot = new FakeElement('div',{left:100,top:200,width:350,height:70});
  const sourceA = new FakeElement('div',{left:160,top:210,width:35,height:45});
  sourceA.dataset.nodeId='a1';
  const sourceB = new FakeElement('div',{left:280,top:210,width:35,height:45});
  sourceB.dataset.nodeId='a2';
  oldRoot.append(sourceA,sourceB);
  equation.append(oldRoot);
  const candidate = new FakeElement('div',{left:100,top:200,width:410,height:70});
  const target = new FakeElement('div',{left:390,top:210,width:40,height:45});
  target.dataset.nodeId='extracted';
  candidate.append(target);
  let confirmed=0;
  const controller=createTransformationPreview(document,equation,{onConfirm:()=>confirmed++});
  return {document,equation,oldRoot,candidate,target,controller,get confirmed(){return confirmed;}};
}

test('preview displays the full proposed expression and provides a clickable result',()=>{
  const f=fixture();
  assert.ok(f.controller.show({candidateElement:f.candidate,sourceNodeIds:['a1','a2'],resultNodeId:'extracted'}));
  assert.equal(f.equation.firstElementChild,f.candidate);
  assert.equal(f.controller.confirmationElement,f.target);
  assert.ok(f.target.classList.contains('transformation-preview__confirm'));
  assert.equal(f.target.attributes.role,'button');
  assert.equal(f.document.body.children.length,0,'ordinary result preview needs no decorative overlay');
  f.target.listeners.click({preventDefault(){},stopPropagation(){}});
  assert.equal(f.confirmed,1);
  f.controller.cancel();
});

test('cancellation restores exact old DOM elements and permits a new preview',()=>{
  const f=fixture();
  const args={candidateElement:f.candidate,sourceNodeIds:['a1','a2'],resultNodeId:'extracted'};
  f.controller.show(args);
  assert.ok(f.controller.cancel());
  assert.equal(f.equation.firstElementChild,f.oldRoot);
  assert.equal(f.controller.active,false);
  assert.equal(f.document.body.children.length,0);
  assert.ok(f.controller.show(args));
  f.controller.cancel();
});

test('confirm finalizes the candidate, without restoring the original DOM',()=>{
  const f=fixture();
  f.controller.show({candidateElement:f.candidate,sourceNodeIds:['a1','a2'],resultNodeId:'extracted'});
  assert.ok(f.controller.finish());
  assert.equal(f.equation.firstElementChild,f.candidate);
  assert.equal(f.controller.active,false);
});

test('missing result ID refuses to replace the original expression',()=>{
  const f=fixture();
  assert.equal(f.controller.show({candidateElement:f.candidate,sourceNodeIds:['a1'],resultNodeId:'missing'}),false);
  assert.equal(f.equation.firstElementChild,f.oldRoot);
  assert.equal(f.controller.active,false);
});

test('Enter on extracted factor confirms the proposal',()=>{
  const f=fixture();
  f.controller.show({candidateElement:f.candidate,sourceNodeIds:['a1'],resultNodeId:'extracted'});
  f.target.listeners.keydown({key:'Enter',preventDefault(){},stopPropagation(){}});
  assert.equal(f.confirmed,1);
  f.controller.cancel();
});

/**
 * A realistic miniature DOM tree: a product containing a grouped sum and a
 * neighbouring factor. The preview must INSERT the amber factor in the same
 * layout sequence, leaving the old source factors visible but faded.
 */
function inlineFixture(direction = 'right') {
  const f = fixture();
  const scope = new FakeElement('div', {left:120,top:200,width:210,height:70});
  scope.dataset.nodeId='scope';
  const product = new FakeElement('span');
  product.classList.add('multiply-content');
  const sibling = new FakeElement('div', {left:350,top:210,width:35,height:45});
  sibling.dataset.nodeId='f';
  const a1 = new FakeElement('div', {left:170,top:215,width:30,height:35});
  a1.dataset.nodeId='a1';
  const a2 = new FakeElement('div', {left:270,top:215,width:30,height:35});
  a2.dataset.nodeId='a2';
  scope.append(a1,a2);
  product.append(scope,sibling);
  f.oldRoot.replaceChildren(product);
  const extracted = new FakeElement('div', {left:335,top:210,width:35,height:45});
  extracted.dataset.nodeId='extracted';
  f.candidate.replaceChildren(extracted);
  const args={candidateElement:f.candidate,sourceNodeIds:['a1','a2'],resultNodeId:'extracted',
    inlineExtraction:{scopeNodeId:'scope',direction}};
  return { ...f, args };
}

test('inline extraction retains faded source factors and inserts amber factor in normal sequence',()=>{
  const f=inlineFixture('right');
  assert.equal(f.controller.show(f.args),true);
  const sequence=f.equation.firstElementChild.children[0];
  assert.deepEqual(sequence.children.map(el=>el.dataset.nodeId || 'operator'),
    ['scope','operator','extracted','f']);
  assert.ok(f.controller.confirmationElement.classList.contains('transformation-preview__introduced-factor'));
  assert.ok(f.equation.querySelectorAll('[data-node-id]').find(el=>el.dataset.nodeId==='a1')
    .classList.contains('is-factorisation-source'));
  assert.equal(f.document.body.children.length,1,'arrows remain present throughout preview');
  assert.equal(f.document.body.children[0].children.length,1,'decorative SVG only');
  assert.ok(f.controller.cancel());
  assert.equal(f.equation.firstElementChild,f.oldRoot,'cancel restores original DOM identity');
});

test('left extraction inserts amber factor before the scoped sum',()=>{
  const f=inlineFixture('left');
  assert.equal(f.controller.show(f.args),true);
  const sequence=f.equation.firstElementChild.children[0];
  assert.deepEqual(sequence.children.map(el=>el.dataset.nodeId || 'operator'),
    ['extracted','operator','scope','f']);
  f.controller.cancel();
});

test('an explicit grouped addend gets a decorative product wrapper, not an extra addend',()=>{
  const f=inlineFixture('left');
  const sequence=f.oldRoot.children[0];
  sequence.classList.items.delete('multiply-content');
  sequence.classList.add('add-content');
  assert.ok(f.controller.show(f.args));
  const wrapper=f.equation.firstElementChild.children[0].children[0];
  assert.ok(wrapper.classList.contains('transformation-preview__visual-product'), JSON.stringify([...wrapper.classList.items]));
  assert.deepEqual(wrapper.children[0].children.map(el=>el.dataset.nodeId || 'operator'),
    ['extracted','operator','scope']);
  f.controller.cancel();
});
