/** T2: explicit recursive Node test discovery. Avoid shell globstar differences across CI/Windows. */
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
function discover(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? discover(full) : entry.isFile() && entry.name.endsWith('.test.js') ? [full] : [];
  });
}
const files = discover('tests').sort();
if (files.length === 0) { console.error('No Node tests discovered.'); process.exit(1); }
console.log(`Node test discovery: ${files.length} files`);
if (process.argv.includes('--list-files')) {
  for (const file of files) console.log(relative('.', file).replaceAll('\\', '/'));
} else {
  const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
  if (result.error) { console.error(result.error); process.exit(1); }
  process.exit(result.status ?? 1);
}
