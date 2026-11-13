// Stage 7: js/rules/bundles.js is the one place a rule is added. Every rule
// folder must be listed there, and every bundle must describe itself fully.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { RULE_BUNDLES } from '../../js/rules/bundles.js';

test('every rule folder is listed once in js/rules/bundles.js', () => {
  const folders = readdirSync(new URL('../../js/rules/', import.meta.url), { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  const ids = RULE_BUNDLES.map(bundle => bundle.id);
  assert.equal(new Set(ids).size, ids.length, 'a bundle is listed twice');
  assert.deepEqual([...ids].sort(), folders);
});

test('each bundle has an install function, features and declarations', () => {
  for (const bundle of RULE_BUNDLES) {
    assert.equal(typeof bundle.install, 'function', bundle.id);
    assert.ok(Array.isArray(bundle.features) && bundle.features.length > 0, bundle.id);
    assert.ok(Array.isArray(bundle.declarations), bundle.id);
  }
});
