/**
 * Presentation choices (owner, 13 November 2026): the maths font, the box
 * style, the spacing of single terms and how subtraction is written. Each only
 * changes presentation: it is written to <html> as a data attribute, which the
 * stylesheets read. The maths font's "auto" removes the attribute, so the
 * stylesheet's default applies (Latin Modern; MLModern on small screens).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRESENTATION_CHOICES, normaliseChoice, readSavedChoice, applyChoice } from '../../js/app/ui/presentationPreferences.js';
import { readAllStylesheets, readStylesheet } from '../helpers/stylesheets.js';

function memoryStorage() {
  const map = new Map();
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
}
const kebab = name => name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

test('an unknown or missing value becomes the default', () => {
  assert.equal(normaliseChoice('mathFont', 'comic-sans'), 'auto');
  assert.equal(normaliseChoice('boxStyle', null), 'tiles');
  assert.equal(normaliseChoice('subtraction', undefined), 'binary');
  assert.equal(normaliseChoice('termSpacing', 'compact'), 'compact');
  assert.throws(() => normaliseChoice('colour', 'red'), /Unknown presentation choice/);
});

test('a choice is set on <html> and remembered; the automatic font removes it', () => {
  const html = { dataset: {} };
  const storage = memoryStorage();
  assert.equal(applyChoice(html, 'mathFont', 'katex', storage), 'katex');
  assert.equal(html.dataset.mathFont, 'katex');
  assert.equal(readSavedChoice('mathFont', storage), 'katex');
  assert.equal(applyChoice(html, 'mathFont', 'auto', storage), 'auto');
  assert.equal('mathFont' in html.dataset, false);
  assert.equal(applyChoice(html, 'boxStyle', 'printed', storage), 'printed');
  assert.equal(html.dataset.boxStyle, 'printed');
  // A choice with no "clear" value is always written, so CSS can target the default.
  assert.equal(applyChoice(html, 'subtraction', 'nonsense', storage), 'binary');
  assert.equal(html.dataset.subtraction, 'binary');
});

test('blocked storage does not stop a choice from applying', () => {
  const html = { dataset: {} };
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(readSavedChoice('termSpacing', blocked), 'roomy');
  assert.equal(applyChoice(html, 'mathFont', 'monospace', blocked), 'monospace');
  assert.equal(html.dataset.mathFont, 'monospace');
});

test('each settings menu offers exactly its choice\'s values, and the stylesheets know them', () => {
  const page = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const css = readAllStylesheets();
  for (const [name, choice] of Object.entries(PRESENTATION_CHOICES)) {
    const start = page.indexOf(`<select id="${name}"`);
    assert.ok(start >= 0, `index.html has no menu for ${name}`);
    const select = page.slice(start, page.indexOf('</select>', start));
    assert.deepEqual([...select.matchAll(/<option value="([\w-]+)"/g)].map(m => m[1]), [...choice.values], name);
    // Every value but one (the plain look, drawn by the ordinary rules) needs a rule.
    const unstyled = choice.values.filter(v => v !== choice.clearWhen)
      .filter(value => !css.includes(`[data-${kebab(choice.attribute)}="${value}"]`));
    assert.ok(unstyled.length <= 1, `${name}: no stylesheet rule for ${unstyled.join(', ')}`);
  }
  const tokens = readStylesheet('tokens');
  for (const font of PRESENTATION_CHOICES.mathFont.values.filter(name => name !== 'auto')) {
    assert.ok(tokens.includes(`:root[data-math-font="${font}"]`), `tokens.css has no font set for ${font}`);
  }
});

test('printed spacing is set by the style alone, never by hover or a state (D13)', () => {
  const css = readAllStylesheets();
  const rules = [...css.matchAll(/([^{}]*data-box-style="printed"[^{}]*)\{([^}]*)\}/g)];
  const sizing = rules.filter(([, , body]) => /padding|min-height|width/.test(body));
  assert.ok(sizing.length >= 2, 'printed sums, products and the implicit gap have sizes');
  for (const [, selector] of sizing) assert.doesNotMatch(selector, /:hover|:focus|is-/, selector.trim());
});
