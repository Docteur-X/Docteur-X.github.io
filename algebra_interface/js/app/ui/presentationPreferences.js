/** Presentation preferences never mutate the mathematical AST or history. */
export function normaliseMultiplicationMode(mode) {
  return ['source', 'implicit', 'dot', 'times'].includes(mode) ? mode : 'source';
}

export function readSavedTheme(storage) {
  try { return storage?.getItem('algebra-workspace-theme') === 'dark' ? 'dark' : 'light'; }
  catch { return 'light'; }
}

export function applyThemePreference(dom, preferences, theme, storage) {
  const state = preferences; // app-wide display choices (applicationState.js)
  state.theme = theme === 'dark' ? 'dark' : 'light';
  dom.html.dataset.theme = state.theme;
  const nextTheme = state.theme === 'light' ? 'dark' : 'light';
  dom.themeToggle.textContent = `Switch to ${nextTheme} mode`;
  dom.themeToggle.setAttribute('aria-pressed', String(state.theme === 'dark'));
  try { storage?.setItem('algebra-workspace-theme', state.theme); }
  catch { /* Rendering remains functional when storage is blocked. */ }
}

/**
 * Presentation choices written to <html> as data attributes, which the
 * stylesheets read (owner, 13 November 2026). Each changes how the mathematics
 * LOOKS, never the expression or its history. A choice equal to `clearWhen` is
 * removed instead, so the stylesheet's own default applies (the maths font's
 * "Automatic" lets a media query choose by screen size).
 *
 *   mathFont      data-math-font      Advanced settings
 *   termSpacing   data-term-spacing   roomy (as before) or compact single terms
 *   boxStyle      data-box-style      tiles, light tiles, or printed (boxes on hover)
 *   subtraction   data-subtraction    a − b (binary) or a + −b (as stored)
 */
export const PRESENTATION_CHOICES = Object.freeze({
  mathFont: Object.freeze({ attribute: 'mathFont', values: Object.freeze(['auto', 'latin-modern', 'mlmodern', 'katex', 'monospace']), fallback: 'auto', clearWhen: 'auto', storageKey: 'algebra-math-font' }),
  termSpacing: Object.freeze({ attribute: 'termSpacing', values: Object.freeze(['roomy', 'compact']), fallback: 'roomy', storageKey: 'algebra-term-spacing' }),
  boxStyle: Object.freeze({ attribute: 'boxStyle', values: Object.freeze(['tiles', 'light', 'printed']), fallback: 'tiles', storageKey: 'algebra-box-style' }),
  subtraction: Object.freeze({ attribute: 'subtraction', values: Object.freeze(['binary', 'tree']), fallback: 'binary', storageKey: 'algebra-subtraction' }),
});

function choiceNamed(name) {
  const choice = PRESENTATION_CHOICES[name];
  if (!choice) throw new Error(`Unknown presentation choice: ${name}`);
  return choice;
}

export function normaliseChoice(name, value) {
  const choice = choiceNamed(name);
  return choice.values.includes(value) ? value : choice.fallback;
}

export function readSavedChoice(name, storage) {
  try { return normaliseChoice(name, storage?.getItem(choiceNamed(name).storageKey)); }
  catch { return choiceNamed(name).fallback; }
}

export function applyChoice(html, name, value, storage) {
  const choice = choiceNamed(name);
  const chosen = normaliseChoice(name, value);
  if (chosen === choice.clearWhen) delete html.dataset[choice.attribute];
  else html.dataset[choice.attribute] = chosen;
  try { storage?.setItem(choice.storageKey, chosen); }
  catch { /* The choice still applies for this visit when storage is blocked. */ }
  return chosen;
}
