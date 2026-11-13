/**
 * Phase 4D-2 integration: a toolbar drag is non-modal; its deliberate identity
 * confirmation preview holds the shared view lease. Cancellation must return
 * the view to a state in which a fresh identity preview can be opened.
 * This uses real pointer input and the existing educational preview controls.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';
import { IdentityToolbar } from '../../pages/IdentityToolbar.js';

test('4D-2: identity cancellation permits a fresh preview and one commit', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('4D identity lease');
  const math = workspace.activeWindow();
  await math.build('a+b');
  const original = await math.astText();
  const initialHistory = await math.historyCount();
  const identity = new IdentityToolbar(page);

  async function openPreview() {
    const box = await identity.start('Add', math.operand(0));
    await identity.hover(box, 'right');
    await identity.drop();
    await expect(page.getByRole('button', { name: 'Confirm identity' })).toBeVisible();
  }

  await openPreview();
  await identity.cancel();
  await expect(page.getByRole('button', { name: 'Confirm identity' })).toBeHidden();
  expect(await math.astText()).toBe(original);
  expect(await math.historyCount()).toBe(initialHistory);

  await openPreview();
  await identity.confirm();
  await expect.poll(() => math.historyCount()).toBe(initialHistory + 1);
  expect(errors).toEqual([]);
});
