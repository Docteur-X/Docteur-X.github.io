import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';
import { multiSelect } from '../../support/mathAssertions.js';

/**
 * Factor extraction uses a temporary explanatory DOM, not a committed AST.
 * The preview renderer owns decorative provenance arrows and must remove
 * them when its preview is cancelled. The host owns the mathematical lease.
 */
test('factorisation provenance arrows belong to the preview lifecycle', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('(a*b+a*c)');
  const beforeMath = await math.astText();
  const beforeHistory = await math.historyCount();
  const factors = math.view.locator('.factor-slot');
  await multiSelect(page, [factors.nth(0), factors.nth(2)]);

  await page.locator('#previewFactorisationButton').click();
  await expect(page.getByRole('button', { name: 'Confirm extraction' })).toBeVisible();
  const arrows = page.locator('.transformation-preview__persistent');
  await expect(arrows).toBeVisible();
  await expect(arrows.locator('svg path[marker-end]')).toHaveCount(2);
  expect(await math.astText()).toBe(beforeMath);
  expect(await math.historyCount()).toBe(beforeHistory);

  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(arrows).toHaveCount(0);
  await expect(page.locator('.transformation-preview__confirm')).toHaveCount(0);
  expect(await math.astText()).toBe(beforeMath);
  expect(await math.historyCount()).toBe(beforeHistory);
});
