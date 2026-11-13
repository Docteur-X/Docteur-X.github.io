/* DOM-level smoke tests for the extraction overlay.
 * The fake DOM checks the event contract and non-layout-changing overlay.
 * Real-browser pointer and CSS appearance still require manual verification. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFactorisationPreview, measureExtractionZone, chooseExtractionZone } from '../../../js/rules/factorisation/overlay.js';

class FakeClassList {
  constructor() {this.names=new Set();}
  add(...names) {names.forEach(n=>this.names.add(n));}
  remove(...names) {names.forEach(n=>this.names.delete(n));}
  contains(name) {return this.names.has(name);}
  toggle(name,enabled) {if(enabled)this.add(name);else this.remove(name);}
}
class FakeElement {
  constructor(tag='div',rect={left:0,top:0,width:40,height:40}) {
    this.tagName=tag; this.rect=rect; this.dataset={}; this.children=[];
    this.classList=new FakeClassList(); this.style={}; this.listeners={};
    this.attributes={}; this.textContent='';
  }
  setAttribute(name,value) {this.attributes[name]=value;}
  append(...children) {this.children.push(...children);}
  replaceChildren(...children) {this.children=[...children];}
  addEventListener(name,callback) {this.listeners[name]=callback;}
  getBoundingClientRect() {return {...this.rect,right:this.rect.left+this.rect.width,bottom:this.rect.top+this.rect.height};}
  remove() {this.removed=true;}
}
function setup() {
  const group=new FakeElement('div',{left:200,top:100,width:160,height:65});
  group.dataset.nodeId='group';
  const a1=new FakeElement('div',{left:220,top:110,width:20,height:30});
  a1.dataset.nodeId='a1';
  const a2=new FakeElement('div',{left:290,top:110,width:20,height:30});
  a2.dataset.nodeId='a2';
  const equation={querySelectorAll:()=>[group,a1,a2]};
  const document={body:new FakeElement('body'),createElement:tag=>new FakeElement(tag),createElementNS:(ns,tag)=>new FakeElement(tag)};
  let entered=0;
  const overlay=createFactorisationPreview(document,equation,{
    onEnterPreview:()=>entered++
  });
  const plan={direction:'left',groupId:'group',sourceFactorIds:['a1','a2']};
  return {equation,document,overlay,plan,group,a1,a2,get entered(){return entered;}};
}

test('extraction zones are outside the Group, never inserted into the equation',()=>{
  const f=setup();
  f.overlay.setPlan(f.plan,'a');
  assert.equal(f.document.body.children.length,1);
  assert.equal(f.overlay.layer.children.length,1);
  assert.equal(f.equation.children,undefined);
  const zone=measureExtractionZone(f.group.getBoundingClientRect(),'left');
  assert.ok(zone.right<f.group.rect.left);
  assert.ok(f.overlay.isInsideZone(zone.left+10,zone.top+10));
  assert.equal(f.overlay.isInsideZone(260,120),false);
});

test('extraction zone only opens the modal preview; it never renders a result factor',()=>{
  const f=setup();
  f.overlay.setPlan(f.plan,'a');
  f.overlay.layer.children[0].listeners.click({preventDefault(){},stopPropagation(){}});
  assert.equal(f.entered,1);
  assert.equal(f.overlay.layer.children.length,1);
  assert.ok(!f.a1.classList.contains('is-factorisation-source'));
  f.overlay.clear();
  assert.equal(f.overlay.layer.children.length,0);
});

test('crowded right-side extraction zone avoids the neighbouring factor',()=>{
  const group={left:200,top:100,right:360,bottom:165,width:160,height:65};
  const neighbour={left:370,top:100,right:420,bottom:165};
  const rect=chooseExtractionZone(group,'right',[neighbour],{width:900,height:700});
  assert.ok(rect);
  assert.ok(rect.bottom<=group.top || rect.top>=group.bottom,
    'zone must move above or below rather than covering the next factor');
});

test('crowded 2-D notation can hide the floating zone and use the toolbar',()=>{
  const group={left:200,top:100,right:360,bottom:165,width:160,height:65};
  const obstacles=[{left:0,top:0,right:900,bottom:700}];
  assert.equal(chooseExtractionZone(group,'right',obstacles,{width:900,height:700}),null);
});

test('right extraction zone is on the right and is a real keyboard-accessible button',()=>{
  const f=setup();
  f.overlay.setPlan({...f.plan,direction:'right'},'a');
  const button=f.overlay.layer.children[0];
  assert.equal(button.tagName,'button');
  assert.equal(button.type,'button');
  assert.ok(measureExtractionZone(f.group.getBoundingClientRect(),'right').left>360);
  assert.equal(button.textContent,'factor →');
});
