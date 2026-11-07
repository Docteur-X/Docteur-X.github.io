import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('touch multi-selection uses the existing selection model and preserves drag completion', () => {
  assert.match(app, /state\.multiSelection\.replace\(state\.expressionRoot, nodeId\)/);
  assert.match(app, /toggleRangeSelection\(nodeId\)/);
  assert.match(app, /drag\.pointerType === "touch"/);
  assert.match(app, /if \(!state\.multiSelection\.size\(\)\) state\.touchMultiSelectMode = false/);
});

test('selection toolbar exposes a pressed state and a touch-accessible control', () => {
  assert.match(html, /id="multiSelectButton"[^>]*aria-pressed="false"/);
  assert.match(app, /dom\.multiSelectButton\.setAttribute\("aria-pressed"/);
});
