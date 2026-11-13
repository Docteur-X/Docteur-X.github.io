/**
 * Phase 5B guardrails: enforce only boundaries already true in the 5A source.
 * No production module is imported/executed by this test.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectDependencies, staticSpecifiers } from '../helpers/dependencyBoundaries.js';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
function collect(directory, sources = {}) {
  for (const entry of fs.readdirSync(path.join(project, directory), { withFileTypes: true })) {
    const file = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) collect(file, sources);
    else if (entry.isFile() && file.endsWith('.js')) sources[file] = fs.readFileSync(path.join(project, file), 'utf8');
  }
  return sources;
}

test('current production ESM graph has no missing relative imports, cycles or forbidden layer edges', () => {
  const sources = collect('js');
  assert.ok(Object.keys(sources).length >= 90, 'unexpectedly incomplete source inventory');
  assert.deepEqual(inspectDependencies(sources), []);
});

test('static import extraction covers multiline imports, re-exports and side-effect imports', () => {
  assert.deepEqual(staticSpecifiers(`import { a,\n b } from './a.js';\nexport { x } from './b.js';\nimport './c.js';`), ['./a.js', './b.js', './c.js']);
});

test('guardrails reject mathematical-to-UI imports and unresolved imports', () => {
  const sources = { 'js/engine/example.js': `import '../view/view.js'; import './missing.js';`, 'js/view/view.js': 'export const view = 1;' };
  const errors = inspectDependencies(sources);
  assert.ok(errors.some(x => x.includes('mathematical layer')));
  assert.ok(errors.some(x => x.includes('unresolved relative import')));
});

test('guardrails reject importing app.js from another module', () => {
  const sources = { 'js/app.js': 'export const start = true;', 'js/view/feature.js': `import '../app.js';` };
  assert.ok(inspectDependencies(sources).some(x => x.includes('composition root')));
});

test('guardrails reject advisory adapter publication imports', () => {
  const sources = { 'js/view/drag/ordinaryDropArbitration.js': `import '../../steps/transformationPublication.js';`, 'js/steps/transformationPublication.js': 'export const publish = true;' };
  assert.ok(inspectDependencies(sources).some(x => x.includes('advisory adapter')));
});

test('guardrails detect cycles without requiring production imports to execute', () => {
  const sources = { 'js/view/a.js': `import './b.js';`, 'js/view/b.js': `export { a } from './a.js';` };
  assert.ok(inspectDependencies(sources).some(x => x.includes('import cycle')));
});

test('comments, strings, templates and regex literals do not invent imports', () => {
  const source = [
    `// import '../ui/phantom.js';`,
    `/* export { x } from '../ui/also-phantom.js'; */`,
    `const message = "import '../ui/phantom.js'";`,
    'const example = `export { x } from "../ui/phantom.js"`;',
    `const pattern = /import\\s+['"]\\.\\.\\/ui\\/phantom.js/;`,
    `import './actual.js';`
  ].join('\n');
  assert.deepEqual(staticSpecifiers(source), ['./actual.js']);
  assert.deepEqual(inspectDependencies({
    'js/engine/example.js': source,
    'js/engine/actual.js': 'export const actual = true;'
  }), []);
});

test('multiline import and export declarations preserve source order', () => {
  const source = `
    import {
      a,
      b
    } from './a.js';
    export * from './b.js';
    export { c as d } from './c.js';
    import './d.js';
  `;
  assert.deepEqual(staticSpecifiers(source), ['./a.js','./b.js','./c.js','./d.js']);
});

test('dynamic imports require review rather than escaping the guardrails silently', () => {
  const sources = {
    'js/engine/example.js': `const view = await import('../view/view.js');`,
    'js/view/view.js': `export const view = 1;`
  };
  assert.ok(inspectDependencies(sources).some(problem => problem.includes('dynamic import()')));
});

test('import.meta is not mistaken for a dynamic module dependency', () => {
  assert.deepEqual(inspectDependencies({
    'js/engine/example.js': `export const url = import.meta.url;`
  }), []);
});

test('escaped module specifiers fail closed for manual review', () => {
  assert.ok(inspectDependencies({
    'js/engine/example.js': String.raw`import './\\u0061.js';`
  }).some(problem => problem.includes('escaped import specifier')));
});
