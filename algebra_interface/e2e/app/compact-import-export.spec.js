import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';
import { expectMathJSON } from '../support/mathAssertions.js';

/** Exercise the real file controls; no test-only application hooks are used. */
test('compact JSON export imports with the same expression and history', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Compact round trip');
  await workspace.activeWindow().build('a+b+c');
  await expectMathJSON(workspace.activeWindow(), ['Add', 'a', 'b', 'c']);
  const count = await workspace.activeWindow().historyCount();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#workspaceExport').click()
  ]);
  const fs = await import('node:fs/promises');
  const payload = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  expect(payload.format).toBe('algebra-document-event-history');
  expect(payload.formatVersion).toBe(1);
  for (const object of Object.values(payload.document.objects)) {
    expect(object.history.nodes.every(node => !Object.hasOwn(node, 'snapshot'))).toBe(true);
  }
  await page.locator('#workspaceImport').setInputFiles({
    name: 'roundtrip.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload))
  });
  await expect(page.locator('#workspaceStatus')).toContainText('Imported');
  await expectMathJSON(new WorkspacePage(page).activeWindow(), ['Add', 'a', 'b', 'c']);
  expect(await new WorkspacePage(page).activeWindow().historyCount()).toBe(count);
  await page.reload();
  await expect(page.getByRole('button', { name: /Compact round trip \(imported\)/ })).toBeVisible();
});

test('invalid compact import leaves the current workspace untouched', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Keep active');
  await workspace.activeWindow().build('a+b');
  const count = await workspace.activeWindow().historyCount();
  await page.locator('#workspaceImport').setInputFiles({
    name: 'corrupt.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({format:'algebra-document-event-history', formatVersion:999, document:{}}))
  });
  await expect(page.locator('#workspaceStatus')).toContainText('Import failed');
  await expectMathJSON(workspace.activeWindow(), ['Add', 'a', 'b']);
  expect(await workspace.activeWindow().historyCount()).toBe(count);
  await expect(page.getByRole('button', { name: 'Keep active' })).toBeVisible();
});

/**
 * Regression: a pending autosave for the source document must not announce
 * "Saved ..." over the successful import, nor lose the source document.
 * The import is initiated immediately after building, within the autosave
 * debounce window; this intentionally exercises the lifecycle overlap.
 */
test('import during pending autosave preserves both documents and import status', async ({ page }) => {
  // T4-2: pause page timers so the autosave debounce cannot fire before the
  // import. Without this, the export step outlasted the delay and the overlap
  // described above never happened, so the test passed with the status gate
  // deliberately broken. IndexedDB itself still runs for real.
  await page.clock.install();
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Autosave source');
  await page.clock.pauseAt(Date.now() + 60_000);
  await workspace.activeWindow().build('a+b');
  // The unsaved marker proves the autosave is still pending during the import.
  await expect(page.getByRole('button', { name: 'Autosave source •', exact: true })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#workspaceExport').click()
  ]);
  const fs = await import('node:fs/promises');
  const payload = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  await page.locator('#workspaceImport').setInputFiles({
    name: 'autosave-overlap.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(payload))
  });
  await expect(page.getByRole('button', { name: /Autosave source \(imported\)/ })).toBeVisible();
  await expect(page.locator('#workspaceStatus')).toContainText('Imported');
  await expectMathJSON(new WorkspacePage(page).activeWindow(), ['Add', 'a', 'b']);
  // T4-2: wait for the source document's own save to finish, not a fixed time.
  // Its unsaved marker clears in the same step that decides whether the save may
  // announce "Saved ...", so the status check below runs after that decision,
  // however slow storage is. It must not replace the import status.
  await expect(page.getByRole('button', { name: 'Autosave source', exact: true })).toBeVisible();
  await expect(page.locator('#workspaceStatus')).toContainText('Imported');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Autosave source', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Autosave source \(imported\)/ })).toBeVisible();
});
