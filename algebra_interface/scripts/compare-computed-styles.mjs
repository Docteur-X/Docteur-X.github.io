// Compares two computed-style captures made by the visual suite (see
// visual/computedStyles.js and the Testing and Verification guide).
// Usage: node scripts/compare-computed-styles.mjs <beforeFolder> <afterFolder>
// Exit code 0 means every property of every element in every state is identical.
import { gunzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [before, after] = process.argv.slice(2);
if (!before || !after) {
  console.error('Usage: node scripts/compare-computed-styles.mjs <beforeFolder> <afterFolder>');
  process.exit(2);
}
const load = (folder, file) => JSON.parse(gunzipSync(readFileSync(join(folder, file))));
const filesBefore = readdirSync(before).filter(file => file.endsWith('.json.gz'));
const filesAfter = new Set(readdirSync(after).filter(file => file.endsWith('.json.gz')));

let compared = 0;
let differences = 0;
const missing = filesBefore.filter(file => !filesAfter.has(file));
// Grouping by "property: old -> new" keeps one cause from printing thousands of lines.
const groups = new Map();
const record = (key, where) => {
  differences += 1;
  const group = groups.get(key) ?? { count: 0, first: where };
  group.count += 1;
  groups.set(key, group);
};

for (const file of filesBefore.filter(name => filesAfter.has(name))) {
  const a = load(before, file);
  const b = load(after, file);
  for (const path of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const where = `${file.replace('.json.gz', '')} ${path}`;
    if (!a[path] || !b[path]) { record(`element ${a[path] ? 'removed' : 'added'}`, where); continue; }
    for (const property of new Set([...Object.keys(a[path]), ...Object.keys(b[path])])) {
      // Token names are not visible. A changed token still shows in every real
      // property that uses it, and renaming one must not count as a difference.
      if (property.startsWith('--')) continue;
      compared += 1;
      if (a[path][property] !== b[path][property]) {
        record(`${property}: ${a[path][property]} -> ${b[path][property]}`, where);
      }
    }
  }
}

console.log(`${filesBefore.length} states, ${compared} values compared, ${differences} differences, ${missing.length} states missing`);
for (const file of missing.slice(0, 20)) console.log(`missing: ${file}`);
const largest = [...groups.entries()].sort((x, y) => y[1].count - x[1].count).slice(0, 40);
for (const [key, group] of largest) console.log(`${group.count}x  ${key}\n      first at ${group.first}`);
process.exit(differences || missing.length ? 1 : 0);
