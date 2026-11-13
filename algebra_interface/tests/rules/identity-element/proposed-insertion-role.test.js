/**
 * Boundary guard: the amber "proposed insertion" look has one source, the shared
 * feedback role. A preview family names the role; it must not repaint it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readAllStylesheets } from '../../helpers/stylesheets.js';

const css = readAllStylesheets();
const identityTool = readFileSync(new URL('../../../js/rules/identity-element/toolPreview.js', import.meta.url), 'utf8');

test('identity preview requests the shared feedback role', () => {
  assert.match(identityTool, /role: 'proposed-insertion'/);
});

test('the identity behaviour class carries no paint', () => {
  const rules = [...css.matchAll(/\.identity-preview-new[^{,]*\{([^}]*)\}/g)].map(match => match[1]);
  assert.ok(rules.length > 0);
  for (const body of rules) {
    assert.doesNotMatch(body, /\b(color|background|outline|border|box-shadow)\b/);
  }
});

test('the identity drop target has no private paint rule', () => {
  assert.doesNotMatch(css, /\.identity-drop-target/);
});
