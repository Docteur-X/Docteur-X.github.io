/**
 * Curated mutation sensitivity checks; NEVER edit the developer's working tree.
 *
 * A mutation is successful when a deliberately incorrect implementation is
 * rejected by a real assertion. We run isolated copies of the source/tests,
 * require the mutation anchor to exist, and distinguish assertion failures
 * from process errors. These are not exhaustive mutation coverage statistics.
 */
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const cases = [
  {
    name: 'factorisation reverses extracted-factor position',
    file: 'js/operations/factorisation.js',
    before: '? [extractedFactor, scope] : [scope, extractedFactor]',
    after: '? [scope, extractedFactor] : [scope, extractedFactor]',
    suite: 'tests/factorisation.test.js'
  },
  {
    name: 'distribution accepts nonadjacent factors',
    file: 'js/operations/distribution.js',
    before: 'if (Math.abs(sourceIndex - targetIndex) !== 1) return null;',
    after: 'if (Math.abs(sourceIndex - targetIndex) < 1) return null;',
    suite: 'tests/distribution.test.js'
  }
];

for (const mutation of cases) {
  const temp = mkdtempSync(join(tmpdir(), 'algebra-quality-mutation-'));
  try {
    mkdirSync(join(temp, 'js'), { recursive: true });
    cpSync(join(root, 'js'), join(temp, 'js'), { recursive: true });
    cpSync(join(root, 'tests'), join(temp, 'tests'), { recursive: true });
    writeFileSync(join(temp, 'package.json'), '{"type":"module"}');
    const file = join(temp, mutation.file);
    const original = readFileSync(file, 'utf8');
    if (!original.includes(mutation.before)) throw new Error(`Mutation anchor missing: ${mutation.name}`);
    writeFileSync(file, original.replace(mutation.before, mutation.after));
    const run = spawnSync(process.execPath, ['--test', mutation.suite], {
      cwd: temp, encoding: 'utf8', timeout: 30_000
    });
    if (run.error) throw run.error;
    if (run.status === 0 || !/not ok/.test(run.stdout)) {
      throw new Error(`Mutation not demonstrably detected: ${mutation.name}\n${run.stdout}\n${run.stderr}`);
    }
    console.log(`KILLED: ${mutation.name}`);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
