import { test, expect } from '@playwright/test';
import { WorkspacePage } from './pages/WorkspacePage.js';
import { expectMathJSON } from './support/mathAssertions.js';

test('document survives reload with the same expression and history', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Persistence browser test');
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  const expected = ['Add', 'a', 'b', 'c'];
  await expectMathJSON(math, expected);
  const count = await math.historyCount();
  // The application persists committed changes locally; do not use test-only storage APIs.
  await expect(page.locator('#workspaceStatus')).toContainText('Saved');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Persistence browser test' })).toBeVisible();
  await page.getByRole('button', { name: 'Persistence browser test' }).click();
  const restored = new WorkspacePage(page).activeWindow();
  await expectMathJSON(restored, expected);
  expect(await restored.historyCount()).toBe(count);
});
