/** Lightweight offline lockfile metadata check; npm ci remains authoritative. */
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url)));
const root = lock.packages?.[''];
if (lock.lockfileVersion !== 3 || root?.name !== pkg.name ||
    JSON.stringify(root.devDependencies ?? {}) !== JSON.stringify(pkg.devDependencies ?? {})) {
  throw new Error('package-lock.json does not match package.json root metadata.');
}
for (const [name, version] of Object.entries(pkg.devDependencies ?? {})) {
  if (lock.packages?.[`node_modules/${name}`]?.version !== version) {
    throw new Error(`Locked version mismatch: ${name}`);
  }
}
const missing = Object.entries(lock.packages).filter(([name, entry]) =>
  name && entry.resolved && !entry.integrity).map(([name]) => name);
if (missing.length) {
  console.warn(`Lockfile has ${missing.length} entries without integrity hashes; regenerate with npm before claiming reproducibility.`);
}
console.log('Root package and pinned dependency metadata match.');
