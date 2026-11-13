/**
 * Boundary guard for the stylesheet's responsibilities.
 *
 * These check what can be stated firmly today. Rules still being moved in step 2
 * of the stylesheet work are not checked here yet; add a check as each boundary
 * becomes true, so that it cannot quietly be crossed again.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { readStylesheet, stylesheetOrder, withoutComments } from '../helpers/stylesheets.js';

const ORDER = ['fonts', 'tokens', 'base', 'interface', 'math-layout', 'hitboxes', 'feedback', 'previews'];

test('styles.css imports every stylesheet once, in the agreed cascade order', () => {
  assert.deepEqual(stylesheetOrder(), ORDER);
  const present = readdirSync(new URL('../../css/', import.meta.url))
    .filter(file => file.endsWith('.css')).map(file => file.replace('.css', ''));
  assert.deepEqual(present.sort(), [...ORDER].sort());
});

test('only tokens.css defines custom properties', () => {
  for (const name of ORDER.filter(item => item !== 'tokens')) {
    assert.doesNotMatch(withoutComments(readStylesheet(name)), /(^|[{;\s])--[\w-]+\s*:/, name);
  }
});

test('colours live only in tokens.css', () => {
  for (const name of ORDER.filter(item => item !== 'tokens')) {
    const css = withoutComments(readStylesheet(name));
    assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|:\s*(white|black)\b/, name);
  }
});

test('every token used is defined, so no rule relies on a fallback', () => {
  const tokens = readStylesheet('tokens');
  for (const name of ORDER) {
    const css = withoutComments(readStylesheet(name));
    for (const [, token, fallback] of css.matchAll(/var\((--[\w-]+)(,)?/g)) {
      assert.ok(tokens.includes(`${token}:`), `${name}: ${token} is not defined`);
      assert.equal(fallback, undefined, `${name}: ${token} has a fallback`);
    }
  }
});

test('amber and green are painted in feedback.css, not by hitboxes or previews', () => {
  // Together with the shared roles, this keeps one owner for what a colour means.
  for (const name of ['hitboxes', 'previews']) {
    assert.doesNotMatch(withoutComments(readStylesheet(name)), /--proposal-|--success|--eligible/, name);
  }
});

test('tokens.css contains nothing that targets an element', () => {
  const selectors = [...withoutComments(readStylesheet('tokens')).matchAll(/([^{}]+)\{/g)]
    .map(match => match[1].trim());
  assert.ok(selectors.length > 0);
  // :root, the dark theme, the maths font sets (13 November 2026) and the
  // small-screen default font, which needs a media query. Still never an element.
  for (const selector of selectors) {
    assert.match(selector, /^(:root(\[data-theme="dark"\]|\[data-math-font="[\w-]+"\]|:not\(\[data-math-font\]\))?|@media \([\w\s:-]+\))$/, selector);
  }
});

test('math layout knows nothing about states or feedback', () => {
  // New notation goes here, so hitboxes and feedback must keep working for it
  // without this file having to mention them.
  assert.doesNotMatch(withoutComments(readStylesheet('math-layout')), /\.is-|math-feedback|:hover|:focus/);
});

// D9 (11 November 2026): copies of the mathematics (rearrangement preview,
// drag ghosts) are attached to <body>, outside #equation. Layout rules for
// hitboxes must therefore be scoped by .math-scope (which #equation and every
// copy carry), never by .equation, or the copies fall back to full-size boxes.
test('hitbox layout rules are scoped by .math-scope, not .equation', () => {
  const css = withoutComments(readStylesheet('hitboxes'));
  const selectors = [...css.matchAll(/([^{}]+)\{/g)].map(match => match[1].trim());
  const equationScoped = selectors.filter(selector => /(^|,\s*)\.equation\s+\[data-hitbox-role/.test(selector));
  assert.deepEqual(equationScoped, []);
});
