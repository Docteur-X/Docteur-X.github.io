/**
 * Phase 4D-1: exercise the real equality preview twice. Cancellation must
 * release the view-local modal lease without publishing mathematics, so a
 * subsequent preview can acquire ownership and commit exactly once.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';
import { expectMathJSON } from '../../support/mathAssertions.js';

test('4D-1: equality cancellation releases ownership for a new preview', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('4D equality ownership');
  const math = workspace.activeWindow();
  await math.build('c');
  await page.locator('#copyMathButton').click();
  await math.build('a=b');
  const initialHistory = await math.historyCount();
  const sign = math.view.locator('.relation-sign');
  await sign.click();
  await page.locator('[data-equality-context="add-right"]').click();
  await sign.click();
  const apply = page.getByRole('button', { name: 'Use selected clipboard expression' });
  await apply.click();
  const preview = math.view.locator('.equality-preview-math');
  await expect(preview).toBeVisible();
  await page.getByTestId('cancel-equality').click();
  await expect(preview).toHaveCount(0);
  await expectMathJSON(math, ['Equal', 'a', 'b']);
  expect(await math.historyCount()).toBe(initialHistory);
  // Cancelling the preview restores the original equation DOM but leaves the
  // equality operation menu closed. Arming and menu visibility are independent:
  // data-armed=add-right does NOT imply that the clipboard action is visible.
  // Reopen the menu explicitly, and only re-arm if the operation was cleared.
  await sign.click();
  await expect(sign).toHaveAttribute('aria-expanded', 'true');
  if (await sign.getAttribute('data-armed') !== 'add-right') {
    await page.locator('[data-equality-context="add-right"]').click();
    await sign.click();
    await expect(sign).toHaveAttribute('aria-expanded', 'true');
  }
  await expect(apply).toBeVisible();
  await apply.click();
  await expect(preview).toBeVisible();
  await page.locator('.equality-preview-math [data-preview-confirm="true"]').first().click();
  await expectMathJSON(math, ['Equal', ['Add', 'a', 'c'], ['Add', 'b', 'c']]);
  expect(await math.historyCount()).toBe(initialHistory + 1);
});
