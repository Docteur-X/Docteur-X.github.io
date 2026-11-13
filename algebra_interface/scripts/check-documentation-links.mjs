/**
 * Documentation link integrity guardrail.
 *
 * Scope: relative Markdown links in the maintained and historical documentation.
 * This is deliberately not a Markdown parser or a status-truth verifier: it
 * checks local destinations, not whether a historical statement remains current.
 * Ignore fenced code blocks and inline code spans so examples cannot be mistaken for navigation.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = join(projectRoot, 'Developer Documentation');

async function markdownFiles(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
  return files;
}

const failures = [];
let linksChecked = 0;
for (const file of [join(projectRoot, 'START_HERE_FOR_NEXT_CHAT.md'), ...await markdownFiles(docsRoot)]) {
  const contents = await readFile(file, 'utf8');
  const fencesRemoved = contents.replace(/^\s*(```|~~~)[^\n]*\n[\s\S]*?^\s*\1[^\n]*$/gm, '');
  // Inline code spans too: `Apply[operator=sin](x)` is canonical text, not a link.
  const withoutFences = fencesRemoved.replace(/`[^`\n]*`/g, '');
  const linkPattern = /(?<!!)\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g;
  for (const match of withoutFences.matchAll(linkPattern)) {
    let destination = match[1].replace(/^<|>$/g, '');
    if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(destination)) continue;
    destination = destination.split('#')[0].split('?')[0];
    if (!destination) continue;
    try { destination = decodeURIComponent(destination); }
    catch { failures.push(`${file}: malformed link encoding: ${match[1]}`); continue; }
    linksChecked += 1;
    try { await stat(resolve(dirname(file), destination)); }
    catch { failures.push(`${file}: missing local target: ${match[1]}`); }
  }
}
if (failures.length) {
  console.error(`Documentation links: ${failures.length} broken of ${linksChecked} checked.`);
  for (const issue of failures) console.error(` - ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Documentation links OK: ${linksChecked} relative links checked.`);
}
