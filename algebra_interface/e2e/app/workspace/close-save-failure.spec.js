/**
 * Browser-level durability regression: a failed IndexedDB write must never
 * make the application discard the only open copy of unsaved mathematics.
 *
 * Intercept the browser storage boundary, not the application save coordinator,
 * so the real UI, queued save, repository and IndexedDB error path are tested.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';

test('failed close-save preserves the document and permits retry', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Close failure regression');
  const math = workspace.activeWindow();
  await math.build('a+b');
  await expect(page.locator('#workspaceStatus')).toContainText('Saved');

  // Simulate a real storage failure at the IndexedDB boundary. Restore the
  // original method before retrying, even if an assertion fails.
  await page.evaluate(() => {
    window.__originalStorePut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'documents') throw new DOMException('Simulated storage failure', 'QuotaExceededError');
      return window.__originalStorePut.apply(this, args);
    };
  });
  let expected;
  try {
    await math.build('a+b+c');
    expected = await math.astText();
    await page.locator('#workspaceClose').click();
    await expect(page.locator('#workspaceStatus')).toContainText('Save failed');
    await expect(page.locator('#workspaceEditor')).toBeVisible();
    expect(await math.astText()).toBe(expected);
  } finally {
    await page.evaluate(() => {
      if (window.__originalStorePut) {
        IDBObjectStore.prototype.put = window.__originalStorePut;
        delete window.__originalStorePut;
      }
    });
  }

  // The failed write must not poison the coordinator's serial write queue.
  await page.locator('#workspaceClose').click();
  await expect(page.locator('#workspaceEditor')).toBeHidden();
  await page.getByRole('button', { name: 'Close failure regression' }).click();
  expect(await workspace.activeWindow().astText()).toBe(expected);
});
