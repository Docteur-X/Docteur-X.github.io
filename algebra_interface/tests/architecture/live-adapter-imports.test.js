import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// The registry owns feature metadata, but app.js and the rule bundles still
// call these adapters directly during live pointer/drop events. A missing
// import breaks interactive commits even though pure mathematical tests pass,
// because the call sits inside an event handler. So: any file that calls one
// of these adapters must import it.
const ADAPTERS = [
  'describeIdentityPreview', 'distributionActionRequest',
  'describeDistributionPreview', 'groupingActionRequest',
  'describeGroupingPreview', 'factorisationActionRequest',
  'describeFactorisationPreview', 'describeRearrangementFeedback',
  'describeNegationCandidate', 'rearrangementActionRequest'
];
const files = ['../../js/app.js', ...readdirSync(new URL('../../js/rules/', import.meta.url), { withFileTypes: true })
  .filter(entry => entry.isDirectory()).map(entry => entry.name)
  .map(rule => `../../js/rules/${rule}/install.js`)];

test('live gesture and visual adapters are imported wherever they are called', () => {
  let checked = 0;
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const name of ADAPTERS) {
      if (!new RegExp(String.raw`\b${name}\(`).test(source)) continue;
      checked++;
      assert.match(source, new RegExp(String.raw`import\s*\{[^}]*\b${name}\b[^}]*\}\s*from\s*["'][^"']+["']`, 's'),
        `${file} calls ${name} but does not import it`);
    }
  }
  assert.ok(checked >= ADAPTERS.length, `only ${checked} adapter calls found; the list may be stale`);
});
