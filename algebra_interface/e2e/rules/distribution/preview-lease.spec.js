/**
 * Phase 4D-4: distribution owns the mathematical view only while its amber
 * confirmation proposal is open. Pointer dragging remains non-modal.
 * A Mathematical Object switch must discard the candidate and release the
 * exact lease, so returning to the original object permits a fresh preview.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';
import { beginPointerDrag, movePointerTo } from '../../support/pointerGestures.js';

test('4D-4: switching objects cancels distribution and allows a fresh preview', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('4D distribution ownership');
  const math = workspace.activeWindow();
  await math.build('a*(b+c)');
  const before = await math.astText();
  const history = await math.historyCount();

  async function propose() {
    const { targetBox } = await beginPointerDrag(page,
      math.view.locator('.factor-slot').first(), math.view.locator('.plus').first());
    await movePointerTo(page, targetBox);
    await expect(math.view.locator('.plus--distribution-drop')).toBeVisible();
    await page.mouse.up();
    await expect(math.view.locator('.distribution-preview__copy').first()).toBeVisible();
  }

  await propose();
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);

  // Switching objects cancels the candidate, restores the rendered source,
  // and releases modal ownership without publishing history.
  page.once('dialog', dialog => dialog.accept('Object 2'));
  await page.getByRole('button', { name: 'New object' }).click();
  await expect(math.view.locator('.distribution-preview__copy')).toHaveCount(0);
  await page.getByRole('button', { name: 'Object 1' }).click();
  await expect.poll(() => math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);

  await propose();
  await page.keyboard.press('Escape');
  await expect(math.view.locator('.distribution-preview__copy')).toHaveCount(0);
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
});

/**
 * Rebuilding the AST while an amber distribution proposal is open must cancel
 * both the mathematical proposal and its view-local modal lease.  Merely
 * removing the amber DOM is insufficient: a stranded lease blocks new drags.
 */
test('4D-4 hardening: expression rebuild releases distribution ownership', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('4D distribution rebuild');
  const math = workspace.activeWindow();
  await math.build('a*(b+c)');

  async function openDistribution() {
    const { targetBox } = await beginPointerDrag(page,
      math.view.locator('.factor-slot').first(), math.view.locator('.plus').first());
    await movePointerTo(page, targetBox);
    await expect(math.view.locator('.plus--distribution-drop')).toBeVisible();
    await page.mouse.up();
    await expect(math.view.locator('.distribution-preview__copy').first()).toBeVisible();
  }

  await openDistribution();
  // Building a new expression must close the old preview and release its lease.
  await math.build('x+y');
  await expect(math.view.locator('.distribution-preview__copy')).toHaveCount(0);
  await math.build('a*(b+c)');
  const before = await math.astText();
  const history = await math.historyCount();
  await openDistribution();
  await page.keyboard.press('Escape');
  await expect(math.view.locator('.distribution-preview__copy')).toHaveCount(0);
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
});
