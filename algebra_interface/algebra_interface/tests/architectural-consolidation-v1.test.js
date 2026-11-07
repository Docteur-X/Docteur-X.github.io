import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEqualityInteractionController } from '../js/interaction/equalityInteractionController.js';
import { createClipboardPanelController } from '../js/interaction/clipboardPanelController.js';

/**
 * These are intentionally architectural boundary tests, not replacements for
 * Playwright behaviour tests. They prevent the refactor from drifting back to
 * app.js or pulling mathematical rule/persistence code into UI controllers.
 */
test('equality and clipboard presentation controllers are independently importable', () => {
  assert.equal(typeof createEqualityInteractionController, 'function');
  assert.equal(typeof createClipboardPanelController, 'function');
});

test('extracted controllers do not import mathematical rules or document persistence', () => {
  for (const file of ['equalityInteractionController.js', 'clipboardPanelController.js']) {
    const source = readFileSync(new URL(`../js/interaction/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /from\s+['"][^'"]*(?:relations\/|operations\/|documentRepository|documentHistory)/);
    assert.doesNotMatch(source, /\b(?:addHistoryNode|queueSave|serializeCompactDocument)\s*\(/);
  }
});

test('app delegates relation menu and preview DOM ownership to the controller', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /createEqualityInteractionController\(/);
  assert.match(app, /equalityUI\.mountOnRenderedEquation\(\)/);
  assert.match(app, /equalityUI\.showPreview\(/);
  assert.doesNotMatch(app, /createElement\(['"]div['"]\)[\s\S]{0,100}equality-operation-menu/);
  assert.doesNotMatch(app, /className\s*=\s*['"]clipboard-entry['"]/);
});
