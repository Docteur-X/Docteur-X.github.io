import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';

test('structural navigation follows nested groups without changing mathematics or history', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('(((30)))');
  const history = await math.historyCount();
  const nav = page.getByTestId('structure-navigator');
  await expect(nav.getByTestId('structure-navigation-current')).toContainText('Group');
  for (let i=0;i<3;i++) await nav.locator('[data-structure-direction="child"]').click();
  await expect(nav.getByTestId('structure-navigation-current')).toContainText('Number');
  await nav.locator('[data-structure-select]').click();
  await expect(math.view.locator('.is-selected')).toHaveCount(1);
  await nav.locator('[data-structure-direction="parent"]').click();
  await expect(nav.getByTestId('structure-navigation-current')).toContainText('Group');
  expect(await math.historyCount()).toBe(history);
});

// Renderer decision R1 (owner, 11 November 2026): a nested sum now has its own
// occurrence box (invisible until hovered). It used to be "content-only".
test('a nested Add is navigable and has its own occurrence box', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a(b+c)');
  const nav = page.getByTestId('structure-navigator');
  await nav.locator('[data-structure-direction="child"]').click(); // first factor a
  await nav.locator('[data-structure-direction="next"]').click(); // Group
  await nav.locator('[data-structure-direction="child"]').click(); // inner Add
  await expect(nav.getByTestId('structure-navigation-current')).toContainText('Add');
  await expect(nav.getByTestId('structure-navigation-current')).not.toContainText('content-only');
  await expect(math.view.locator('.is-structure-navigated')).toHaveCount(1);
  await expect(math.view.locator('.nested-operation[data-hitbox-role="occurrence"]')).toHaveCount(1);
});
