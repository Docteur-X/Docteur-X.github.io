import { test, expect } from '@playwright/test';
import { WorkspacePage } from './pages/WorkspacePage.js';
import { multiSelect } from './support/mathAssertions.js';

test('cancelling a grouping preview preserves expression and history', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  const before = await math.astText();
  const count = await math.historyCount();
  await multiSelect(page, [math.operand(0), math.operand(1)]);
  await page.getByRole('button', { name: 'Preview grouping of selected adjacent operands' }).first().click();
  await expect(page.getByRole('button', { name: 'Confirm grouping', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Confirm grouping', exact: true })).toBeHidden();
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(count);
});
