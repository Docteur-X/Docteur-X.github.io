/**
 * Phase 4D-5: a factor selection/extraction drag is non-modal; only the
 * deliberate confirmation preview owns the mathematical view's modal lease.
 * Rebuilding an expression must discard that proposal and permit reacquisition.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';
import { multiSelect } from '../../support/mathAssertions.js';

test('4D-5: rebuilding during factorisation preview releases ownership for a new preview', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('4D factorisation lease');
  const math = workspace.activeWindow();
  const expression = '(a*b+a*c)';
  await math.build(expression);
  const selectFactors = async () => {
    // Identify the two common factors by their accessible mathematical labels,
    // rather than relying on a generic factor-slot DOM ordering.
    const commonFactors = math.view.getByRole('button', {
      name: 'Factor: a. Arrows reorder; click selects.', exact: true
    });
    await expect(commonFactors).toHaveCount(2);
    await multiSelect(page, [commonFactors.nth(0), commonFactors.nth(1)]);
  };
  await selectFactors();
  await page.locator('#previewFactorisationButton').click();
  await expect(page.getByRole('button', { name: 'Confirm extraction' })).toBeVisible();

  // A new expression replaces the old mathematical source and invalidates
  // its preview. A lease left behind would prevent the second preview.
  await math.build(expression);
  await expect(page.getByRole('button', { name: 'Confirm extraction' })).toHaveCount(0);
  const before = await math.astText();
  const history = await math.historyCount();
  // Rebuilding invalidates the old preview, but selection and preview ownership
  // are distinct interaction states. Explicitly start a new selection request
  // rather than relying on what a prior preview left selected.
  await page.keyboard.press('Escape');
  await expect(math.view.locator('.is-multi-selected')).toHaveCount(0);
  await selectFactors();
  await expect(page.locator('#previewFactorisationButton')).toBeEnabled();
  await page.locator('#previewFactorisationButton').click();
  await expect(page.getByRole('button', { name: 'Confirm extraction' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
});
