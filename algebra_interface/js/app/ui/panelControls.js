/**
 * Panel controls (stage 6): the buttons and fields AROUND the equation, wired
 * to named actions. The page's controls are listed here; what each action
 * does stays with its owner (app.js passes the actions).
 *
 * WHY: before stage 6 app.js added each of these listeners itself, between
 * the drag code and start-up. Now app.js only says WHAT each control does,
 * and a new control is added here plus one action.
 *
 * These are ordinary buttons, not the equation: equation pointer and key
 * input goes through the input router (js/view/inputRouter.js).
 */
export function bindPanelControls(dom, actions) {
  const on = (element, type, handler) => element.addEventListener(type, handler);

  // Expression editing.
  on(dom.expressionForm, 'submit', event => {
    event.preventDefault();
    actions.buildExpression(dom.expressionInput.value);
  });
  on(dom.resetButton, 'click', () => actions.resetExpression());

  // Symbol values.
  on(dom.variablesList, 'input', actions.variableDraftInput);
  on(dom.applyValuesButton, 'click', actions.applyVariableValues);
  on(dom.clearValuesButton, 'click', actions.clearVariableValues);

  // Display choices.
  on(dom.multiplicationDisplayMode, 'change', () => actions.setMultiplicationDisplay(dom.multiplicationDisplayMode.value));
  on(dom.hitboxVisibilityMode, 'change', () => actions.setHitboxVisibility(dom.hitboxVisibilityMode.value));
  for (const name of ['mathFont', 'boxStyle', 'termSpacing', 'subtraction']) {
    on(dom[name], 'change', () => actions.setPresentation(name, dom[name].value));
  }
  on(dom.themeToggle, 'click', () => actions.toggleTheme());

  // Selection toolbar and clipboard.
  // (The bracket buttons are wired by the grouping bundle.)
  on(dom.copyMathButton, 'click', () => actions.copySelection());
  on(dom.multiSelectButton, 'click', () => actions.toggleTouchMultiSelect());

  // History panel and dialog.
  on(dom.historyToggle, 'click', () => {
    const isExpanded = dom.historyToggle.getAttribute('aria-expanded') === 'true';
    dom.historyToggle.setAttribute('aria-expanded', String(!isExpanded));
    dom.historyPanel.hidden = isExpanded;
  });
  function handleHistorySelection(event) {
    // The restoration boundary itself dismisses previews before changing the
    // source, including keyboard activation of a focused history entry.
    const button = event.target.closest('[data-history-id]');
    if (!button) return;
    actions.restoreHistoryNode(Number(button.dataset.historyId));
    if (dom.historyDialog.open) dom.historyDialog.close();
  }
  on(dom.historyTree, 'click', handleHistorySelection);
  on(dom.historyGraphTree, 'click', handleHistorySelection);
  on(dom.openHistoryGraphButton, 'click', () => {
    actions.renderHistoryGraph();
    if (typeof dom.historyDialog.showModal === 'function') dom.historyDialog.showModal();
    else dom.historyDialog.setAttribute('open', '');
  });
  on(dom.closeHistoryGraphButton, 'click', () => {
    if (typeof dom.historyDialog.close === 'function') dom.historyDialog.close();
    else dom.historyDialog.removeAttribute('open');
  });
  on(dom.historyDialog, 'click', event => {
    if (event.target === dom.historyDialog) dom.historyDialog.close();
  });
}
