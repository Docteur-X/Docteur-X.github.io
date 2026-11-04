/* Regression guard: pointer reordering has already animated its proposed
 * destination, so committing must not replay the same movement via FLIP.
 * This focused source-level guard complements the mathematical tests; a real
 * browser test should eventually assert no post-drop position transition. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('pointer reorder commits without a second FLIP animation', () => {
  const start = source.indexOf('if (commit && target.kind === "insert")');
  const end = source.indexOf('// Invalid hitbox, outside drop', start);
  assert.ok(start >= 0 && end > start);
  const reorderCommit = source.slice(start, end);
  assert.match(reorderCommit, /renderApplication\(false\)/);
  assert.doesNotMatch(reorderCommit, /renderApplication\(\s*\)/);
});
