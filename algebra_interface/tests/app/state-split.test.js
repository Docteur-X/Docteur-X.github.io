// Stage 6a: app.js holds no single shared `state` object any more. A leftover
// reference (e.g. the shorthand `{ state }`) silently pointed at nothing and
// broke every commit, so this test forbids the bare name in app.js code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('app.js uses documentState, viewState and preferences, never a bare `state`', () => {
  const code = readFileSync(new URL('../../js/app.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    .replace(/(['"`])(?:\.|(?!\1).)*\1/g, '""');
  const bare = code.split('\n').filter(line => /(?<![\w.$])state(?![\w$]|\s*:)/.test(line));
  assert.deepEqual(bare, []);
});

// Stage 6c: controls are wired in js/app/ui/panelControls.js and
// js/app/workspace/workspaceControls.js; app.js only passes their actions.
test('app.js adds no listener to a page control', () => {
  const code = readFileSync(new URL('../../js/app.js', import.meta.url), 'utf8');
  assert.deepEqual(code.split('\n').filter(line => /dom\.\w+\.addEventListener/.test(line)), []);
});

// Stage 6d: the workspace session owns document state only. It reaches the
// equation view through its `view` hooks, never by importing view code.
test('the workspace session imports no view, rule or interaction code', () => {
  const code = readFileSync(new URL('../../js/app/workspace/workspaceSession.js', import.meta.url), 'utf8');
  const imports = [...code.matchAll(/from '([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(imports.filter(path => /\/(view|rules|interaction|rendering)\//.test(path) || path.endsWith('app.js')), []);
  assert.ok(!/viewState|viewMode|extensions\./.test(code));
});
