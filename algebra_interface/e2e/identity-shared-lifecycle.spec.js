import { test, expect } from '@playwright/test';
import { WorkspacePage } from './pages/WorkspacePage.js';
import { IdentityToolbar } from './pages/IdentityToolbar.js';

// Browser-level protection for the migrated confirmation lifecycle: the
// mathematical object is unchanged during preview and one click commits once.
test('identity confirmation uses one history commit and cannot be repeated', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a+b');
  const before = await math.historyCount();
  const identity = new IdentityToolbar(page);
  const box = await identity.start('Add', math.operand(0));
  await identity.hover(box, 'right');
  await identity.drop();
  await expect(page.getByRole('button', { name: 'Confirm identity' })).toBeVisible();
  expect(await math.historyCount()).toBe(before);
  await identity.confirm();
  await expect.poll(() => math.historyCount()).toBe(before + 1);
  await expect(page.getByRole('button', { name: 'Confirm identity' })).toBeHidden();
});
