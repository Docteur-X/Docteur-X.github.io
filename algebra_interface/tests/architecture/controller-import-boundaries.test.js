import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEqualityInteractionController } from '../../js/rules/equality/controller.js';
import { createClipboardPanelController } from '../../js/view/clipboardPanelController.js';

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
  // Since stage 4 the equality controller lives in the equality rule bundle.
  for (const file of ['rules/equality/controller.js', 'view/clipboardPanelController.js']) {
    const source = readFileSync(new URL(`../../js/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /from\s+['"][^'"]*(?:relations\/|operations\/|documentRepository|documentHistory)/);
    assert.doesNotMatch(source, /\b(?:addHistoryNode|queueSave|serializeCompactDocument)\s*\(/);
  }
});

test('relation menu and preview DOM are owned by the controller, through the equality bundle', () => {
  // Stage 6: the equation's mount moved to js/view/equationView.js; read both.
  const app = ['../../js/app.js', '../../js/view/equationView.js']
    .map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join(String.fromCharCode(10));
  const bundle = readFileSync(new URL('../../js/rules/equality/install.js', import.meta.url), 'utf8');
  assert.match(bundle, /createEqualityInteractionController\(/);
  assert.match(bundle, /controller\.mountOnRenderedEquation\(\)/);
  assert.match(bundle, /controller\.showPreview\(/);
  assert.match(app, /extensions\.emit\('equationMounted'\)/);
  assert.doesNotMatch(app, /createElement\(['"]div['"]\)[\s\S]{0,100}equality-operation-menu/);
  assert.doesNotMatch(app, /className\s*=\s*['"]clipboard-entry['"]/);
});
