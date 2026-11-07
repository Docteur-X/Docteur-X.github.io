import { test, expect } from '@playwright/test';
import { WorkspacePage } from './pages/WorkspacePage.js';
import { beginPointerDrag, movePointerTo } from './support/pointerGestures.js';
import { expectOneCommit } from './support/mathAssertions.js';

/** Browser-level protection for the new shared commit gate. The amber preview
 * must not mutate the Mathematical Object; cancelling must discard it, and a
 * subsequent proposal must still confirm through exactly one history event. */
test('distribution cancellation followed by confirmation commits exactly once', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a*(b+c)');
  const before = await math.astText();
  const count = await math.historyCount();
  async function propose() {
    const { targetBox } = await beginPointerDrag(page,
      math.view.locator('.factor-slot').first(), math.view.locator('.plus').first());
    await movePointerTo(page, targetBox);
    // Distribution is a deliberate hover target. Wait for the same eligible
    // amber + state used by the established distribution browser test before
    // releasing, rather than racing the gesture interpreter under load.
    await expect(math.view.locator('.plus--distribution-drop')).toBeVisible();
    await page.mouse.up();
    await expect(math.view.locator('.distribution-preview__copy').first()).toBeVisible();
  }
  await propose();
  expect(await math.astText()).toBe(before);
  await page.keyboard.press('Escape');
  await expect(math.view.locator('.distribution-preview__copy')).toHaveCount(0);
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(count);
  await propose();
  await math.view.locator('.distribution-preview__copy').first().click();
  await expectOneCommit(math, before, count);
});
