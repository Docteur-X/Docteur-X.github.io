import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationTransformationFeatures } from '../js/composition/transformationFeatureAssembly.js';
import { normaliseMultiplicationMode, readSavedTheme, applyThemePreference } from '../js/ui/presentationPreferences.js';
import { renderWorkspaceNavigation, renderObjectNavigation } from '../js/ui/workspaceNavigation.js';

function fakeElement() {
  return { children: [], disabled: false, hidden: false,
    ownerDocument: { createElement: () => ({ dataset: {}, setAttribute(name, value) { this[name] = value; } }) },
    replaceChildren() { this.children = []; }, append(child) { this.children.push(child); } };
}
function fakeDom() {
  const names = ['workspaceList','workspaceEditor','workspaceEmpty','workspaceSave','workspaceRename',
    'workspaceDuplicate','workspaceClose','workspaceDelete','workspaceExport','workspaceName',
    'objectList','objectRename','objectDelete'];
  return Object.fromEntries(names.map(name => [name, fakeElement()]));
}

test('application feature composition registers stable transformation IDs including equality application', () => {
  const registry = createApplicationTransformationFeatures();
  assert.deepEqual(registry.list().map(f => f.id), [
    'negation.expand', 'negation.compress', 'equality.apply-function', 'identity.introduce', 'multiplication.distribute', 'grouping.range',
    'factorisation.left', 'factorisation.right', 'addition.combine-numeric', 'multiplication.combine-numeric', 'addition.rearrange', 'multiplication.rearrange'
  ]);
  for (const feature of registry.list()) {
    assert.equal(typeof feature.propose, 'function');
    assert.equal(typeof feature.gesture, 'function');
    assert.equal(typeof feature.visual, 'function');
  }
});

test('presentation preferences normalise modes and tolerate blocked storage', () => {
  assert.equal(normaliseMultiplicationMode('dot'), 'dot');
  assert.equal(normaliseMultiplicationMode('unknown'), 'source');
  assert.equal(readSavedTheme({ getItem: () => { throw Error('blocked'); } }), 'light');
  const attributes = {};
  const dom = { html: { dataset: {} }, themeToggle: { setAttribute(k,v) { attributes[k]=v; } } };
  const state = {};
  applyThemePreference(dom, state, 'dark', { setItem: () => { throw Error('blocked'); } });
  assert.equal(state.theme, 'dark');
  assert.equal(dom.html.dataset.theme, 'dark');
  assert.equal(attributes['aria-pressed'], 'true');
});

test('workspace navigation is presentation-only and handles empty documents', () => {
  const dom = fakeDom();
  renderWorkspaceNavigation(dom, new Map(), null, new Set(), null);
  assert.equal(dom.workspaceEditor.hidden, true);
  assert.equal(dom.workspaceSave.disabled, true);
  assert.equal(dom.objectRename.disabled, true);
  const obj = { id:'o1', title:'Auxiliary expression' };
  const doc = { id:'d1', title:'Exercise', objects:{o1:obj}, objectOrder:['o1'], activeObjectId:'o1' };
  const docs = new Map([[doc.id,doc]]);
  renderWorkspaceNavigation(dom, docs, doc.id, new Set([doc.id]), doc);
  assert.equal(dom.workspaceList.children[0].dataset.documentId, 'd1');
  assert.match(dom.workspaceList.children[0].textContent, /•/);
  assert.equal(dom.objectList.children[0].dataset.objectId, 'o1');
  assert.equal(dom.workspaceEditor.hidden, false);
  assert.equal(dom.workspaceSave.disabled, false);
  renderObjectNavigation(dom, null);
  assert.equal(dom.objectList.children.length, 0);
  assert.equal(dom.objectDelete.disabled, true);
});
