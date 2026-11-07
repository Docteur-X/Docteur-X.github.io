import { test, expect } from '@playwright/test';
import { WorkspacePage } from './pages/WorkspacePage.js';
import { expectMathJSON } from './support/mathAssertions.js';

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
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Autosave source');
  await workspace.activeWindow().build('a+b');
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
  // Allow any earlier pending save completion to occur. It must not replace
  // the current import status or remove the original document.
  await page.waitForTimeout(500);
  await expect(page.locator('#workspaceStatus')).toContainText('Imported');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Autosave source', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Autosave source \(imported\)/ })).toBeVisible();
});
