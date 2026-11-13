/** Opt-in mutation probe. Never edits the working tree.
 * A deliberate noncommutative-order bug must be detected by Engine unit tests. */
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const temp = mkdtempSync(join(tmpdir(), 'algebra-mutation-'));
try {
  mkdirSync(join(temp, 'js'), { recursive: true });
  cpSync(join(root, 'js'), join(temp, 'js'), { recursive: true });
  cpSync(join(root, 'tests'), join(temp, 'tests'), { recursive: true });
  writeFileSync(join(temp, 'package.json'), '{"type":"module"}');
  const file = join(temp, 'js/engine/operations/distribution.js');
  const original = readFileSync(file, 'utf8');
  const correct = '? [copiedFactor, addend] : [addend, copiedFactor]';
  const incorrect = '? [addend, copiedFactor] : [addend, copiedFactor]';
  if (!original.includes(correct)) throw new Error('Mutation anchor changed; review probe before running.');
  writeFileSync(file, original.replace(correct, incorrect));
  // TAP output names each failing test with "not ok". Node's default reporter
  // changed between versions (Node 24 prints a cross instead), so ask for TAP
  // explicitly rather than depend on the default.
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/rules/distribution/distribution.test.js'], {
    cwd: temp, encoding: 'utf8', timeout: 30_000
  });
  if (result.error) throw result.error;
  if (result.status === 0) throw new Error('Mutation SURVIVED: distribution tests did not detect reversed factor order.');
  if (!/not ok/.test(result.stdout)) throw new Error('Mutation run failed without a test assertion failure.');
  console.log('Mutation KILLED: distribution tests detected incorrect factor ordering.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
