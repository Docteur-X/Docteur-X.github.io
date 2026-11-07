import { test, expect } from '@playwright/test';
import { WorkspacePage } from './pages/WorkspacePage.js';
import { multiSelect, expectOneCommit, expectMathJSON } from './support/mathAssertions.js';

test('common factors: extraction proposal, cancel, then confirm', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('(a*b+a*c)');
  const before = await math.astText();
  const count = await math.historyCount();
  // The two leading a factors are the first factor of each product.
  const factors = math.view.locator('.factor-slot');
  await multiSelect(page, [factors.nth(0), factors.nth(2)]);
  await expect(page.locator('#previewFactorisationButton')).toBeEnabled();
  await page.locator('#previewFactorisationButton').click();
  await expect(page.getByRole('button', { name: 'Confirm extraction' })).toBeVisible();
  expect(await math.astText()).toBe(before);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await math.historyCount()).toBe(count);
  expect(await math.astText()).toBe(before);
  await page.locator('#previewFactorisationButton').click();
  await page.getByRole('button', { name: 'Confirm extraction' }).click();
  await expectOneCommit(math, before, count);
  await expectMathJSON(math, ['Multiply', 'a', ['Add', 'b', 'c']]);
});
