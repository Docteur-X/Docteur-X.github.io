/**
 * A rough "undefined name" check for modules moved out of app.js (stage 6).
 *
 * WHY: twice in stage 6 a moved block used a name that the new module never
 * imported or received (`{ state }`, then an `as` alias). The Node tests do
 * not run that code, and the browser showed only "nothing happened" because
 * the error was swallowed on the drop path. This finds such names without a
 * parser: it lists every identifier that is used, then removes the declared,
 * imported and parameter names, properties, keywords and browser globals.
 * It may miss a name (it is generous about declarations), but what it reports
 * is almost always real.
 */
const KEYWORDS = new Set(`break case catch class const continue debugger default delete do else export
extends false finally for function if import in instanceof let new null of return super switch this
throw true try typeof undefined var void while with yield async await from as static get set`.split(/\s+/));
const GLOBALS = new Set(`window document console Math Date JSON Object Array Number String Boolean Map Set
WeakMap WeakSet Promise Error TypeError RangeError Symbol URL Blob setTimeout clearTimeout
requestAnimationFrame cancelAnimationFrame structuredClone Infinity NaN isNaN parseInt parseFloat
getComputedStyle Node Element HTMLElement Event navigator localStorage globalThis queueMicrotask
BigInt Reflect Proxy Intl`.split(/\s+/));

export function freeNames(source) {
  // One pass over comments and strings together, so `//` inside a string
  // (e.g. 'http://…') is not taken for a comment, and quotes inside comments
  // are not taken for strings. Template text is dropped; its ${…} kept.
  const code = source
    .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:\\.|\$\{[^}]*\}|[^`\\])*`|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/g, match => {
      if (match.startsWith('/')) return ' ';
      if (match.startsWith('`')) return [...match.matchAll(/\$\{([^}]*)\}/g)]
        // Strings inside ${…} are text too.
        .map(m => ` ${m[1].replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/g, '""')} `).join(' ') || '""';
      return '""';
    })
    .replace(/\/(?![*/])(?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n])+\/[gimsuy]*(?=\s*[.,;)\]}]|\s*$)/gm, '""')
    // `export { a, b } from '…'` re-exports names; it does not use them here.
    .replace(/export\s*\{[^}]*\}\s*from\s*""/g, ' ');
  const declared = new Set();
  const add = list => list.split(',').forEach(part => {
    const name = part.trim().split(/\s+as\s+/).pop().split(/[=:]/)[0].replace(/^\.\.\./, '').trim();
    if (/^[A-Za-z_$][\w$]*$/.test(name)) declared.add(name);
  });
  for (const m of code.matchAll(/import\s*\{([^}]*)\}/g)) add(m[1]);
  for (const m of code.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from/g)) declared.add(m[1]);
  for (const m of code.matchAll(/\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) declared.add(m[1]);
  // Destructuring and parameters: every name inside ( ... ) or { ... } that
  // follows const/let or a function head, roughly: take all identifiers
  // directly inside parameter lists and destructuring patterns.
  for (const m of code.matchAll(/\b(?:const|let|var)\s*[{[]([^=]*?)[}\]]\s*=/g)) add(m[1].replace(/[{}[\]]/g, ','));
  for (const m of code.matchAll(/\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*(?:=>|\{)/g)) add(m[1].replace(/[{}[\]]/g, ','));
  // Simple parameter lists again, since the pass above may have consumed an
  // inner arrow function's list as part of an outer one.
  for (const m of code.matchAll(/\(([^()]*)\)\s*=>/g)) add(m[1].replace(/[{}[\]]/g, ','));
  // Method shorthand in an object literal: `name(...) {`.
  for (const m of code.matchAll(/(?:^|[{,])\s*(?:async\s+|get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*\{/gm)) declared.add(m[1]);
  // Later names in one declaration: `const width = a, height = b;`.
  for (const m of code.matchAll(/\b(?:const|let|var)\s+[^;\n]*/g)) {
    for (const later of m[0].matchAll(/,\s*([A-Za-z_$][\w$]*)\s*=(?!=)/g)) declared.add(later[1]);
  }
  for (const m of code.matchAll(/(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*=>/g)) declared.add(m[1]);
  for (const m of code.matchAll(/catch\s*\(\s*([A-Za-z_$][\w$]*)/g)) declared.add(m[1]);
  for (const m of code.matchAll(/\bfor\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) declared.add(m[1]);
  // Whole identifiers only; skip properties (`a.name`) and object keys
  // (`name: value`; a ternary's middle operand is skipped too, a rare miss).
  const used = new Set();
  const body = code.replace(/^\s*import\s[^;]*;/gm, ' ');
  for (const m of body.matchAll(/[A-Za-z_$][\w$]*/g)) {
    const before = body.slice(0, m.index).match(/(\S)\s*$/)?.[1];
    if (before && /[\w$]/.test(body[m.index - 1] ?? '')) continue;
    if (before === '.' && !body.slice(0, m.index).endsWith('...')) continue;
    if (/^\s*:(?!:)/.test(body.slice(m.index + m[0].length, m.index + m[0].length + 4)) &&
        /[{,]\s*$/.test(body.slice(Math.max(0, m.index - 40), m.index))) continue;
    used.add(m[0]);
  }
  return [...used].filter(name => !declared.has(name) && !KEYWORDS.has(name) && !GLOBALS.has(name)).sort();
}
