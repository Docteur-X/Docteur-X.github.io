import { test, expect } from '@playwright/test';
import { WorkspacePage } from './pages/WorkspacePage.js';

/** Keyboard rearrangement has immediate confirmation, unlike modal previews.
 * It must nevertheless use the same single-use, detached history boundary. */
test('keyboard rearrangement commits one history event and retains node identities', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  const before = await math.historyCount();
  const first = math.operand(0);
  const movedId = await first.getAttribute('data-node-id');
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => math.historyCount()).toBe(before + 1);
  await expect(math.view.locator(`.add-operand[data-node-id="${movedId}"]`)).toBeVisible();
  await expect(math.view.locator('.add-operand').nth(1)).toHaveAttribute('data-node-id', movedId);
});
