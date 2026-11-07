/** Presentation preferences never mutate the mathematical AST or history. */
export function normaliseMultiplicationMode(mode) {
  return ['source', 'implicit', 'dot', 'times'].includes(mode) ? mode : 'source';
}

export function readSavedTheme(storage) {
  try { return storage?.getItem('algebra-workspace-theme') === 'dark' ? 'dark' : 'light'; }
  catch { return 'light'; }
}

export function applyThemePreference(dom, state, theme, storage) {
  state.theme = theme === 'dark' ? 'dark' : 'light';
  dom.html.dataset.theme = state.theme;
  const nextTheme = state.theme === 'light' ? 'dark' : 'light';
  dom.themeToggle.textContent = `Switch to ${nextTheme} mode`;
  dom.themeToggle.setAttribute('aria-pressed', String(state.theme === 'dark'));
  try { storage?.setItem('algebra-workspace-theme', state.theme); }
  catch { /* Rendering remains functional when storage is blocked. */ }
}
