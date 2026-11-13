import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';
import { multiSelect, expectOneCommit } from '../../support/mathAssertions.js';

/**
 * Browser-level proof that the migrated factorisation commit gate is reachable
 * through the real student gesture. The existing factorisation suite separately
 * covers the mathematical result and preview's visual explanation.
 */
test('factorisation preview cancellation then confirmation commits once', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('(a*b+a*c)');
  const before = await math.astText();
  const count = await math.historyCount();
  const factors = math.view.locator('.factor-slot');
  await multiSelect(page, [factors.nth(0), factors.nth(2)]);
  const preview = page.locator('#previewFactorisationButton');
  await expect(preview).toBeEnabled();
  await preview.click();
  await expect(page.getByRole('button', { name: 'Confirm extraction' })).toBeVisible();
  expect(await math.historyCount()).toBe(count);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(count);
  await preview.click();
  const confirm = page.getByRole('button', { name: 'Confirm extraction' });
  await expect(confirm).toBeVisible();
  await confirm.click();
  await expectOneCommit(math, before, count);
  await expect(confirm).toHaveCount(0);
  expect(await math.historyCount()).toBe(count + 1);
});
