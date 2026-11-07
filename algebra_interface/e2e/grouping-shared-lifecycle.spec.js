import { test, expect } from '@playwright/test';
import { WorkspacePage } from './pages/WorkspacePage.js';
import { multiSelect, expectOneCommit } from './support/mathAssertions.js';

/** Confirm that the migrated grouping lifecycle is reachable via student UI. */
test('grouping cancel then confirm commits one history event', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  const before = await math.astText();
  const count = await math.historyCount();
  await multiSelect(page, [math.operand(0), math.operand(1)]);
  const preview = page.getByRole('button', { name: 'Preview grouping of selected adjacent operands' }).first();
  await expect(preview).toBeVisible();
  await preview.click();
  const confirm = page.getByRole('button', { name: 'Confirm grouping', exact: true });
  await expect(confirm).toBeVisible();
  expect(await math.historyCount()).toBe(count);
  await page.keyboard.press('Escape');
  await expect(confirm).toBeHidden();
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(count);
  await preview.click();
  await expect(confirm).toBeVisible();
  await confirm.click();
  await expectOneCommit(math, before, count);
  await expect(confirm).toBeHidden();
  expect(await math.historyCount()).toBe(count + 1);
});
