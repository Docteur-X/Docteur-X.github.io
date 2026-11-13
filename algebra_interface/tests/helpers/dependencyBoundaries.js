/**
 * Phase 5B: repository-only dependency inspection.
 *
 * This deliberately inspects static ESM specifiers, not JavaScript runtime
 * calls. The project uses static relative ESM imports; if dynamic imports are
 * introduced, expand the checker rather than assuming they were checked.
 * Pure functions are exported to allow adversarial fixture tests.
 */
import path from 'node:path';

// The layers by folder (clean-up C5): the mathematics (engine, definitions)
// and what builds on it (documents, steps) never import what draws it (view)
// or what wires the page (app).
const MATH_DIRS = new Set(['engine', 'definitions', 'documents', 'steps']);
const PRESENTATION_DIRS = new Set(['view', 'app']);
const ADAPTER_NAMES = /(?:Arbitration|CommandRouting)\.js$/;
const PUBLICATION_MODULES = /\/(?:transformationPublication|atomicTransformationCommit|documentRepository|documentController|documentHistory)\.js$/;

/**
 * Lex the small subset of JavaScript needed to find ESM declarations.
 * Unlike a regular expression, this skips comments, quoted strings, regular
 * expressions and complete template literals. The scanner deliberately does
 * not claim to be a full JavaScript parser; unfamiliar dynamic imports are
 * reported for review rather than silently omitted.
 *
 * Tokens have { kind: 'word'|'string'|'punct', value }. String tokens retain
 * their decoded content only for simple unescaped specifiers; escaped module
 * names are reported as unsupported to avoid resolving the wrong path.
 */
function lex(source) {
  const tokens = [];
  let i = 0;
  const n = source.length;
  const isStart = c => /[A-Za-z_$]/.test(c || '');
  const isPart = c => /[\w$]/.test(c || '');
  const regexAfter = new Set(['=', '(', '[', '{', ':', ',', ';', '!', '?', 'return', 'throw', '=>']);
  while (i < n) {
    const c = source[i], next = source[i + 1];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && next === '/') { i += 2; while (i < n && source[i] !== '\n') i++; continue; }
    if (c === '/' && next === '*') { i += 2; while (i < n && !(source[i] === '*' && source[i+1] === '/')) i++; i = Math.min(n, i+2); continue; }
    if (c === '\'' || c === '"' || c === '`') {
      const quote = c;
      let value = '', escaped = false;
      i++;
      while (i < n) {
        const ch = source[i++];
        if (ch === '\\') { escaped = true; i++; continue; }
        if (ch === quote) break;
        value += ch;
      }
      if (quote !== '`') tokens.push({kind:'string', value, escaped});
      // Template contents, including interpolations, are deliberately opaque.
      continue;
    }
    if (isStart(c)) {
      const start = i++;
      while (i < n && isPart(source[i])) i++;
      tokens.push({kind:'word', value:source.slice(start,i)});
      continue;
    }
    if (c === '/' && (tokens.length === 0 || regexAfter.has(tokens.at(-1).value))) {
      i++;
      let inClass = false;
      while (i < n) {
        const ch = source[i++];
        if (ch === '\\') { i++; continue; }
        if (ch === '[') inClass = true;
        if (ch === ']') inClass = false;
        if (ch === '/' && !inClass) break;
      }
      while (i < n && /[a-z]/i.test(source[i])) i++;
      tokens.push({kind:'punct',value:'regex'});
      continue;
    }
    tokens.push({kind:'punct',value:c});
    i++;
  }
  return tokens;
}

/**
 * Inspect ESM module specifiers. Static imports/re-exports are returned in
 * order; dynamic import() and import.meta are separately reported for review.
 */
export function inspectSpecifiers(source) {
  const tokens = lex(source);
  const staticImports = [], unsupported = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind !== 'word' || !['import','export'].includes(token.value)) continue;
    const next = tokens[i+1];
    if (token.value === 'import' && next?.value === '(') {
      unsupported.push('dynamic import() requires architectural review');
      continue;
    }
    if (token.value === 'import' && next?.value === '.') continue; // import.meta
    if (token.value === 'import' && next?.kind === 'string') {
      if (next.escaped) unsupported.push('escaped import specifier requires review');
      else staticImports.push(next.value);
      i++;
      continue;
    }
    // An import/export declaration's 'from' must occur before its terminating
    // semicolon. The ordinary project uses conventional ESM declarations.
    for (let j=i+1; j<tokens.length && tokens[j].value !== ';'; j++) {
      if (tokens[j].value === 'from' && tokens[j+1]?.kind === 'string') {
        if (tokens[j+1].escaped) unsupported.push('escaped import specifier requires review');
        else staticImports.push(tokens[j+1].value);
        i=j+1;
        break;
      }
      // Avoid walking into the next declaration if semicolons are omitted.
      if (j > i+1 && tokens[j].kind === 'word' && ['import','export'].includes(tokens[j].value)) break;
    }
  }
  return {staticImports, unsupported};
}

/** Backwards-compatible helper for tests and dependency graph consumers. */
export function staticSpecifiers(source) {
  return inspectSpecifiers(source).staticImports;
}

export function inspectDependencies(sources) {
  const problems = [];
  const edges = new Map();
  const known = new Set(Object.keys(sources));
  for (const [file, source] of Object.entries(sources)) {
    const destinations = [];
    const scanned = inspectSpecifiers(source);
    for (const issue of scanned.unsupported) problems.push(`${file}: ${issue}`);
    for (const specifier of scanned.staticImports) {
      if (!specifier.startsWith('.')) continue;
      const destination = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
      if (!known.has(destination)) {
        problems.push(`${file}: unresolved relative import ${specifier} (${destination})`);
        continue;
      }
      destinations.push(destination);
      const group = file.split('/')[1];
      const destGroup = destination.split('/')[1];
      if (MATH_DIRS.has(group) && PRESENTATION_DIRS.has(destGroup)) {
        problems.push(`${file}: mathematical layer imports presentation layer ${destination}`);
      }
      if (file !== 'js/app.js' && destination === 'js/app.js') {
        problems.push(`${file}: composition root must not be imported`);
      }
      if (group === 'view' && ADAPTER_NAMES.test(file) && PUBLICATION_MODULES.test(destination)) {
        problems.push(`${file}: advisory adapter imports publication/persistence ${destination}`);
      }
    }
    edges.set(file, destinations);
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(file, stack) {
    if (visiting.has(file)) {
      problems.push(`import cycle: ${[...stack, file].join(' -> ')}`);
      return;
    }
    if (visited.has(file)) return;
    visiting.add(file);
    for (const dep of edges.get(file) || []) visit(dep, [...stack, file]);
    visiting.delete(file);
    visited.add(file);
  }
  for (const file of edges.keys()) visit(file, []);
  return problems;
}
