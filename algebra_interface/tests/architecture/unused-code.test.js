// Clean-up C7: no export that nothing imports, and no module nothing imports
// (scripts/report-unused.mjs, also `npm run report:unused`). Exports used only
// by tests are listed by the report but allowed: small pure functions are
// tested directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('no unused exports and no unreferenced modules', () => {
  const script = fileURLToPath(new URL('../../scripts/report-unused.mjs', import.meta.url));
  const { stdout, status } = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(status, 0);
  assert.match(stdout, /Unused exports \(0\)/);
  assert.match(stdout, /Unreferenced modules \(0\)/);
});
