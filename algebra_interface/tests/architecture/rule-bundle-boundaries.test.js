/**
 * Rule bundles (standard 3, stage 4): a rule names only its own things.
 * - A file in js/rules/<rule>/ may import its own folder, the Engine
 *   (core, operations, relations) and shared interaction helpers, but never
 *   app.js, another rule, the renderer, ui or workspace code.
 * - Code outside a rule's folder imports it only through its index.js or its
 *   pure rule.js (decision 3.1).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, normalize, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const js = join(project, 'js');
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(join(dir, entry.name)) : entry.name.endsWith('.js') ? [join(dir, entry.name)] : []);
const importsOf = file => [...readFileSync(file, 'utf8').matchAll(/^\s*(?:import|export)[^'"]*?from\s*['"](\.[^'"]+)['"]/gm)]
  .map(m => normalize(join(dirname(file), m[1])));
const rel = path => relative(js, path).split(sep).join('/');

test('a rule bundle imports only its own folder, the Engine and shared interaction helpers', () => {
  const problems = [];
  for (const file of files(join(js, 'rules'))) {
    const own = rel(dirname(file));
    for (const target of importsOf(file).map(rel)) {
      const allowed = target.startsWith(own + '/') ||
        // The layers a rule may use (clean-up C5): the mathematics (engine,
        // definitions), documents, a step's lifecycle (steps) and the view's
        // shared helpers (view, including view/rendering/inert.js). Never app/.
        /^(engine|definitions|documents|steps|view)\//.test(target);
      if (!allowed || target === 'app.js') problems.push(`${rel(file)} imports ${target}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('outside code uses a rule only through its index.js or rule.js', () => {
  const problems = [];
  for (const file of files(js).filter(f => !rel(f).startsWith('rules/'))) {
    for (const target of importsOf(file).map(rel).filter(t => t.startsWith('rules/'))) {
      // rules/bundles.js is the one list of bundles (stage 7).
      if (!/^rules\/[^/]+\/(index|rule)\.js$/.test(target) && target !== 'rules/bundles.js') problems.push(`${rel(file)} imports ${target}`);
    }
  }
  // Not yet moved: semanticInput.js builds negation's expansion request.
  assert.deepEqual(problems.filter(p => p !== 'view/semanticInput.js imports rules/negation/gesture.js'), []);
});

// Prevention (stage E4b): two bundles once named a route the same
// (identity-preview-outside); the router refuses that at start-up, which only
// a browser test showed. Every route name in every install must be unique.
test('route names are unique across all rule bundles and views', () => {
  const seen = new Map();
  const duplicates = [];
  for (const file of [...files(join(js, 'rules')), ...files(join(js, 'view')), ...files(join(js, 'app'))]) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/route\(\{\s*name:\s*['"]([^'"]+)['"]/g)) {
      if (seen.has(match[1])) duplicates.push(`${match[1]}: ${seen.get(match[1])} and ${rel(file)}`);
      else seen.set(match[1], rel(file));
    }
  }
  assert.ok(seen.size > 20, `only ${seen.size} routes found; the pattern may be stale`);
  assert.deepEqual(duplicates, []);
});

// Clean-up C2 and E4d: every rule whose preview is "the result with the new
// parts in amber" uses the shared js/view/preview/candidatePreview.js, never
// its own copy (owner, 12 November 2026: one amber look for every preview).
test('rule bundles build no Confirm/Cancel preview of their own', () => {
  const own = files(join(js, 'rules')).map(rel)
    .filter(file => />\s*Confirm\s*</.test(readFileSync(join(js, file), 'utf8')) ||
      /textContent\s*=\s*['"]Confirm['"]/.test(readFileSync(join(js, file), 'utf8')));
  assert.deepEqual(own, []);
});

// Clean-up C3: every rule returns ONE result shape, result.root plus its own
// fields; factorisation once also returned a copy under result.proposal
// (lesson 12: two shapes invite mistakes).
test('no rule returns its tree a second time under result.proposal', () => {
  const doubled = files(join(js, 'rules')).map(rel)
    .filter(file => /return\s*\{[^}]*\bproposal\b[^}]*\}/.test(readFileSync(join(js, file), 'utf8')));
  assert.deepEqual(doubled, []);
});

// Clean-up C6: tests are named by what they check and grouped by subject
// (tests/engine, tests/rules/<bundle>, tests/view …), never by the phase or
// version in which they were written.
test('no test file is named after a phase or version', () => {
  const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
  const historical = [...walk(join(project, 'tests')), ...walk(join(project, 'e2e'))]
    .map(file => relative(project, file).split(sep).join('/'))
    .filter(file => /\.(test|spec)\.js$/.test(file))
    .filter(file => /(^|[/-])(phase\d|v\d+[.-]|retrospective|closure|consolidation|migration)/i.test(file));
  assert.deepEqual(historical, []);
});
