// Stage 6: every name a module uses must be declared, imported, a parameter
// or a known global. Twice in stage 6 a block moved out of app.js lost a
// name, which failed only at run time, and silently (see Known Issues,
// lesson 9). This catches that in the Node tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freeNames } from '../helpers/freeNames.js';
import { readdirSync } from 'node:fs';

function rulesFiles(dir = 'js/rules') {
  return readdirSync(new URL(`../../${dir}/`, import.meta.url), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? rulesFiles(`${dir}/${entry.name}`) : entry.name.endsWith('.js') ? [`${dir}/${entry.name}`] : []);
}

const MODULES = ['js/app.js', 'js/view/drag/ordinaryDragView.js', 'js/app/workspace/workspaceSession.js',
  'js/app/workspace/workspaceControls.js', 'js/app/ui/panelControls.js', 'js/app/ruleExtensions.js',
  'js/app/applicationState.js',
  'js/view/historyView.js', 'js/app/ui/symbolPanel.js', 'js/view/selectionView.js',
  'js/view/equationSelectionRoutes.js', 'js/view/equationRoutes.js', 'js/view/equationView.js',
  'js/app/ruleContext.js',
  // Every file of every rule bundle, found by itself (a new bundle needs no edit here).
  ...rulesFiles()];

for (const path of MODULES) {
  test(`no undefined names: ${path}`, () => {
    assert.deepEqual(freeNames(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')), []);
  });
}

test('the check finds a name that was never imported', () => {
  assert.deepEqual(freeNames("import { a } from './a.js';\nexport const f = () => a(b);\n"), ['b']);
  assert.deepEqual(freeNames("import { x as y } from './x.js';\nexport const f = () => x();\n"), ['x']);
});

// The whole module graph of app.js must parse and link: a syntax error, or an
// import of a name a module does not export, fails here (as a SyntaxError).
// Running app.js needs a browser, so the only acceptable failure in Node is
// that `document` is missing.
test('app.js and every module it imports parse and link', async () => {
  const error = await import('../../js/app.js').then(() => null, caught => caught);
  assert.ok(error, 'app.js unexpectedly ran without a browser');
  assert.equal(error.name, 'ReferenceError', `${error.name}: ${error.message}`);
  assert.match(error.message, /document is not defined/);
});
