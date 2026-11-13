/**
 * Coupling report: how widely each feature is spread through the code.
 *
 * This measures the goal of the rebuild plan
 * (Developer Documentation/06_Historical_Records/Superseded_2026-11-12/Rebuild_Plan.md (decisions: 00_Current/Decisions.md)):
 * a rule should live in its own folder, and the composition file
 * (`js/app.js`) and the renderer should not need to mention it.
 *
 * It is a deliberately simple text count, not a parser. A "mention" is any
 * line containing the feature's word stem, case-insensitively, so comments
 * count too. That is intended: a comment naming a feature in `app.js` is a
 * sign the feature's behaviour is still explained (and usually wired) there.
 *
 * Usage:  npm run report:coupling
 *
 * ADVISORY ONLY (owner, 11 November 2026): the aim is lower complexity and
 * better architecture, not a lower line count. Nothing fails on these numbers.
 * The report prints the change since `scripts/coupling-baseline.json` (the
 * version 628 starting point) so progress is visible.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Feature name -> word stem searched for. Add a row when a rule is added. */
export const FEATURE_STEMS = Object.freeze({
  factorisation: 'factoris',
  'both-sides': 'both-sides', // stage 7: the first rule built only as a bundle
  'cancel-opposites': 'cancel-opposites',
  'cancel-inverses': 'cancel-inverses',
  grouping: 'grouping',
  identity: 'identity',
  negation: 'negation',
  distribution: 'distribut',
  rearrangement: 'rearrang',
  combination: 'combin',
  equality: 'equality'
});

const APP_FILE = 'js/app.js';
const RENDERER_FILE = 'js/view/rendering/domRenderer.js';

function javascriptFiles(folder) {
  const files = [];
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) files.push(...javascriptFiles(path));
    else if (entry.name.endsWith('.js')) files.push(path);
  }
  return files;
}

// Counts lines the same way as `wc -l`: a final newline does not add a line.
const lineCount = (text) => text.split('\n').length - (text.endsWith('\n') ? 1 : 0);

/**
 * Measure the project as it is on disk.
 * Returns { appLines, interactionLines, features: { name: { files, appLines, rendererLines } } }.
 */
export function measureCoupling(root = projectRoot) {
  const sources = javascriptFiles(join(root, 'js')).map(path => ({
    path: relative(root, path).split('\\').join('/'),
    lines: readFileSync(path, 'utf8').split('\n')
  }));
  const byPath = new Map(sources.map(source => [source.path, source.lines]));
  const mentions = (lines, stem) => lines.filter(line => line.toLowerCase().includes(stem)).length;

  const features = {};
  for (const [name, stem] of Object.entries(FEATURE_STEMS)) {
    features[name] = {
      files: sources.filter(source => mentions(source.lines, stem) > 0).length,
      appLines: mentions(byPath.get(APP_FILE) ?? [], stem),
      rendererLines: mentions(byPath.get(RENDERER_FILE) ?? [], stem)
    };
  }
  // The interaction layer, as the rebuild plan counts it: everything in js/
  // that is not the Engine, app.js included. Since clean-up C5 the Engine is
  // the folders engine/, definitions/ and documents/ (what core, operations,
  // relations, types and operators held before), so the count is comparable.
  const engine = /^js\/(engine|definitions|documents)\//;
  const interactionLines = sources
    .filter(source => !engine.test(source.path))
    .reduce((sum, source) => sum + lineCount(source.lines.join('\n')), 0);
  return {
    appLines: lineCount(readFileSync(join(root, APP_FILE), 'utf8')),
    interactionLines,
    features
  };
}

// Print a table when run directly, not when imported by another script.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = measureCoupling();
  const start = JSON.parse(readFileSync(new URL('./coupling-baseline.json', import.meta.url), 'utf8'));
  // Show "now (change since the start)", e.g. "98 (-4)". Advisory only.
  const show = (now, then) => then === undefined ? `${now}` : `${now} (${now - then >= 0 ? '+' : ''}${now - then})`;
  console.log(`Coupling report, advisory (change since ${start.recorded})\n`);
  console.table(Object.fromEntries(Object.entries(report.features).map(([name, value]) => [name, {
    'files mentioning it': show(value.files, start.features[name]?.files),
    'lines in app.js': show(value.appLines, start.features[name]?.appLines),
    'lines in renderer': show(value.rendererLines, start.features[name]?.rendererLines)
  }])));
  console.log(`app.js: ${show(report.appLines, start.appLines)} lines`);
  console.log(`Interaction layer (all js/ outside engine/, definitions/ and documents/; app.js included): ${show(report.interactionLines, start.interactionLines)} lines`);
}
