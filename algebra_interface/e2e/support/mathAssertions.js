import { expect } from '@playwright/test';

/** Compare committed mathematical state, not typography or transient previews. */
export async function expectOneCommit(window, beforeTree, beforeCount) {
  await expect.poll(() => window.historyCount()).toBe(beforeCount + 1);
  expect(await window.astText()).not.toBe(beforeTree);
}

/** Compare the public mathematical representation exactly, including operand order.
 * MathJSON omits editor-only Group nodes; explicit brackets need a separate DOM assertion.
 * Do not use "tree changed" as a substitute for a mathematical oracle. */
export async function expectMathJSON(window, expected) {
  await expect.poll(async () => JSON.parse(await window.astText())).toEqual(expected);
}

/** Ctrl/Cmd selection is an interaction, not a mathematical history event. */
export async function multiSelect(page, locators) {
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  for (const locator of locators) await locator.click({ modifiers: [modifier] });
}
