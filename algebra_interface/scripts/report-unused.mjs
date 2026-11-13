/**
 * Unused code report (clean-up C7): exports no other module imports, and
 * modules nothing imports. Run with `npm run report:unused`.
 *
 *   unused       exported, imported by nothing (not even a test)
 *   test-only    exported, imported only by tests: kept for a test, or dead
 *   unreferenced a module under js/ that no module or test imports (js/app.js,
 *                the entry point, excepted)
 *
 * It reads import statements only (static imports and re-exports), so a name
 * used through `import * as` is counted as used when the namespace is
 * imported. It reports; it never changes a file.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.name === 'node_modules' || entry.name === 'baseline' ? []
    : entry.isDirectory() ? walk(join(dir, entry.name)) : /\.(m?js)$/.test(entry.name) ? [join(dir, entry.name)] : []);
const rel = file => relative(root, file).split(sep).join('/');

const production = walk(join(root, 'js'));
const testsAndTools = [...walk(join(root, 'tests')), ...walk(join(root, 'e2e')), ...walk(join(root, 'visual')), ...walk(join(root, 'scripts'))];

function exportsOf(source) {
  const names = new Set();
  for (const m of source.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([\w$]+)/gm)) names.add(m[1]);
  for (const m of source.matchAll(/^export\s*\{([^}]*)\}(?!\s*from)/gm)) {
    for (const part of m[1].split(',')) { const name = part.trim().split(/\s+as\s+/).pop(); if (name) names.add(name); }
  }
  return names;
}
function importsOf(file, source) {
  const out = [];
  // One statement at a time: the clause may span lines but never another statement.
  for (const m of source.matchAll(/^\s*(?:import|export)\s*([^;'"]*?)\s*from\s*['"](\.[^'"]+)['"]/gm)) {
    const target = rel(normalize(join(dirname(file), m[2])));
    const clause = m[1];
    const star = /\*\s*(?:as\s+[\w$]+)?/.test(clause) && !/\{/.test(clause);
    const names = [...(clause.match(/\{([^}]*)\}/)?.[1] ?? '').split(',')].map(part => part.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    out.push({ target, names, star });
  }
  for (const m of source.matchAll(/^\s*import\s*['"](\.[^'"]+)['"]/gm)) out.push({ target: rel(normalize(join(dirname(file), m[1]))), names: [], star: true });
  for (const m of source.matchAll(/import\(\s*['"](\.[^'"]+)['"]\s*\)/g)) out.push({ target: rel(normalize(join(dirname(file), m[1]))), names: [], star: true });
  return out;
}

const usedBy = new Map(); // "file::name" -> Set('prod' | 'test')
const imported = new Map(); // file -> Set('prod' | 'test')
const mark = (map, key, kind) => { if (!map.has(key)) map.set(key, new Set()); map.get(key).add(kind); };
for (const [files, kind] of [[production, 'prod'], [testsAndTools, 'test']]) {
  for (const file of files) {
    for (const { target, names, star } of importsOf(file, readFileSync(file, 'utf8'))) {
      mark(imported, target, kind);
      if (star) mark(usedBy, `${target}::*`, kind);
      for (const name of names) mark(usedBy, `${target}::${name}`, kind);
    }
  }
}

const unused = [], testOnly = [], unreferenced = [];
for (const file of production) {
  const name = rel(file);
  if (name !== 'js/app.js' && !imported.has(name)) unreferenced.push(name);
  const star = usedBy.get(`${name}::*`);
  for (const exported of exportsOf(readFileSync(file, 'utf8'))) {
    const users = usedBy.get(`${name}::${exported}`) ?? star;
    if (!users) unused.push(`${name}: ${exported}`);
    else if (!users.has('prod')) testOnly.push(`${name}: ${exported}`);
  }
}
const section = (title, list) => console.log(`\n${title} (${list.length})\n${list.map(item => `  ${item}`).join('\n')}`);
section('Unused exports', unused);
section('Test-only exports', testOnly);
section('Unreferenced modules', unreferenced);
