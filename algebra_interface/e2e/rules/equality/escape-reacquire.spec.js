import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';

/**
 * Equality owns its Escape interaction during document capture. The preview
 * host, not the key listener, owns the modal lease and candidate lifecycle.
 * Reopening after Escape verifies both boundaries without assuming that
 * unrelated non-modal selection must survive equality preview entry.
 */
test('equality Escape dismisses one proposal and permits a fresh preview', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Equality Escape ownership');
  const math = workspace.activeWindow();
  await math.build('c');
  await page.locator('#copyMathButton').click();
  await math.build('a=b');
  const original = await math.astText();
  const history = await math.historyCount();
  const sign = math.view.locator('.relation-sign');
  const preview = math.view.locator('.equality-preview-math');
  const apply = page.getByRole('button', { name: 'Use selected clipboard expression' });

  await sign.click();
  await page.locator('[data-equality-context="add-right"]').click();
  await sign.click();
  await apply.click();
  await expect(preview).toBeVisible();

  // A capture-phase equality dismissal must consume exactly one Escape.
  // A passive window listener observes whether the same event leaks through
  // to the application fallback, without relying on selection CSS that may
  // be temporarily replaced by the preview DOM.
  await page.evaluate(() => {
    window.__equalityEscapeWindowCount = 0;
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape') window.__equalityEscapeWindowCount += 1;
    });
  });
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.__equalityEscapeWindowCount)).toBe(0);
  await expect(preview).toHaveCount(0);
  expect(await math.astText()).toBe(original);
  expect(await math.historyCount()).toBe(history);

  // The equality sign TOGGLES the menu. Escape cancels the proposal but
  // does not promise a particular menu-open state. Do not accidentally close
  // an already-open menu while testing whether the preview lease was released.
  if (await sign.getAttribute('aria-expanded') !== 'true') {
    await sign.click();
  }
  await expect(sign).toHaveAttribute('aria-expanded', 'true');
  if (await sign.getAttribute('data-armed') !== 'add-right') {
    await page.locator('[data-equality-context="add-right"]').click();
    if (await sign.getAttribute('aria-expanded') !== 'true') await sign.click();
    await expect(sign).toHaveAttribute('aria-expanded', 'true');
  }
  await expect(apply).toBeVisible();
  await apply.click();
  await expect(preview).toBeVisible();
  await page.getByTestId('cancel-equality').click();
  await expect(preview).toHaveCount(0);
  expect(await math.astText()).toBe(original);
  expect(await math.historyCount()).toBe(history);

  // Once no equality preview owns Escape, normal window-level input dispatch
  // must resume. This guards against globally swallowing the key.
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.__equalityEscapeWindowCount)).toBe(1);
});
