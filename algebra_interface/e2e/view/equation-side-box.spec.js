/**
 * R1 for an equation side (12 November 2026): a sum that is a whole side of an
 * equation has its own invisible box, so its + belongs to it.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';

test('the + of an equation side lights that side, and a click selects it', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Side');
  const math = workspace.activeWindow();
  await math.build('2x+3=y');
  const side = math.view.locator('.equation-side');
  await expect(side).toHaveCount(1);
  const glow = () => side.evaluate(el => getComputedStyle(el).boxShadow);
  const rest = await glow();
  const plus = side.locator('.plus').first();
  await plus.scrollIntoViewIfNeeded();
  await plus.hover();
  await expect.poll(glow).not.toBe(rest);
  await plus.click();
  await expect(side).toHaveClass(/is-selected/);
});
