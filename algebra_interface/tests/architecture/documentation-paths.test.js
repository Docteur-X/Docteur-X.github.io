// Clean-up C8: the current documentation names real files. Every path written
// in backticks in the current pages (00_Current/ and the Adding things guide)
// must exist, so a move or a rename cannot leave the pipelines out of date.
// The documentation link check (npm run check:docs) covers Markdown links.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const docs = new URL('../../Developer Documentation/', import.meta.url);
const pages = [
  ...readdirSync(new URL('00_Current/', docs)).filter(name => name.endsWith('.md')).map(name => `00_Current/${name}`),
  '03_Developer_Guides/Adding_Things.md',
];

test('every file path named in the current documentation exists', () => {
  const missing = [];
  let checked = 0;
  for (const page of pages) {
    const text = readFileSync(new URL(page, docs), 'utf8');
    for (const [, path] of text.matchAll(/`((?:js|tests|e2e|css|scripts|visual)\/[^`\s]*)`/g)) {
      if (path.includes('<') || path.includes('*')) continue; // a pattern such as js/rules/<bundle>/
      checked += 1;
      if (!existsSync(new URL(`../../${path}`, import.meta.url))) missing.push(`${page}: ${path}`);
    }
  }
  assert.ok(checked > 60, `only ${checked} paths found; the pattern may be stale`);
  assert.deepEqual(missing, []);
});
