/**
 * Explicit brackets (grouping bundle, js/rules/grouping/explicitBrackets.js,
 * moved out of app.js in stage 6f): Wrap, Remove and the double-click toggle
 * each commit one history step, on a copy of the tree.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';

async function setup(page) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Brackets');
  const math = workspace.activeWindow();
  await math.build('a+b');
  return math;
}
const termA = math => math.view.locator('.add-operand').filter({ hasText: /^a$/ }).first();

test('Wrap puts brackets around the selection, and Remove takes them off', async ({ page }) => {
  const math = await setup(page);
  const before = await math.historyCount();
  await termA(math).click();
  await page.locator('#groupStyle').selectOption('round');
  await page.locator('#wrapGroupButton').click();
  await expect(page.locator('#expressionInput')).toHaveValue('(a)+b');
  expect(await math.historyCount()).toBe(before + 1);
  // The new Group is selected, so Remove is offered.
  await expect(page.locator('#removeGroupButton')).toBeEnabled();
  await page.locator('#removeGroupButton').click();
  await expect(page.locator('#expressionInput')).toHaveValue('a+b');
  expect(await math.historyCount()).toBe(before + 2);
});

test('double-clicking the selected term toggles round brackets', async ({ page }) => {
  const math = await setup(page);
  const before = await math.historyCount();
  await termA(math).dblclick();
  await expect(page.locator('#expressionInput')).toHaveValue('(a)+b');
  expect(await math.historyCount()).toBe(before + 1);
});
