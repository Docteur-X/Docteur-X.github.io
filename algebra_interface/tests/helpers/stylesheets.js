/**
 * Reads the stylesheet the way a browser does: styles.css is only a list of
 * imports, so tests about CSS must follow it rather than read one file.
 */
import { readFileSync } from 'node:fs';

const fromRoot = path => new URL(`../../${path}`, import.meta.url);

/** Imported file names, in cascade order, without the css/ folder or extension. */
export function stylesheetOrder() {
  const manifest = readFileSync(fromRoot('styles.css'), 'utf8');
  return [...manifest.matchAll(/@import url\("css\/([\w-]+)\.css"\)/g)].map(match => match[1]);
}

export function readStylesheet(name) {
  return readFileSync(fromRoot(`css/${name}.css`), 'utf8');
}

/** All stylesheets joined in cascade order, as the browser would apply them. */
export function readAllStylesheets() {
  return stylesheetOrder().map(readStylesheet).join('\n');
}

/** Removes comments, so a sentence about a class is not mistaken for a rule. */
export function withoutComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}
