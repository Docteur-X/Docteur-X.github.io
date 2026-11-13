/**
 * A modal preview owns its mathematical source until confirmation or
 * cancellation. Sidebar substitutions and history restoration must not
 * silently change that source while the preview remains visible.
 *
 * Expression replacement and workspace navigation are separate explicit
 * context-change operations and are deliberately not asserted here.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';

async function setup(page) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Modal context gate');
  const math = workspace.activeWindow();
  await math.build('-(a+b)');
  return math;
}

test('applying variable values is blocked while a negation preview is open', async ({ page }) => {
  const math = await setup(page);
  const input = page.locator('.variable-input').first();
  await input.fill('2');
  const before = await math.astText();
  const history = await math.historyCount();
  await math.view.locator('.negate-operator-hitbox').click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  await page.locator('#applyValuesButton').click();
  await expect(page.locator('#variableStatus')).toContainText('Confirm or cancel');
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
  await page.keyboard.press('Escape');
  await page.locator('#applyValuesButton').click();
  await expect(page.locator('#variableStatus')).toContainText('Variable values applied');
});

test('clearing applied values is blocked during an active preview', async ({ page }) => {
  const math = await setup(page);
  await page.locator('.variable-input').first().fill('2');
  await page.locator('#applyValuesButton').click();
  const history = await math.historyCount();
  await math.view.locator('.negate-operator-hitbox').click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  await page.locator('#clearValuesButton').click();
  await expect(page.locator('#variableStatus')).toContainText('Confirm or cancel');
  expect(await math.historyCount()).toBe(history);
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('#clearValuesButton').click();
  await expect(page.locator('#variableStatus')).toContainText('cleared');
});
