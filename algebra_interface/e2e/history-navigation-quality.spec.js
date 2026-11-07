/**
 * Browser contract: history branches must be *navigable*, not merely serializable.
 * The fixture has two siblings under the initial state. We select each sibling
 * using the same visible history buttons a student uses, then verify the exact
 * expression against an independent fixture snapshot (not the active cursor).
 *
 * This complements the import/export tests, which compare stored JSON but do
 * not establish that students can actually visit historical branches.
 */
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { WorkspacePage } from './pages/WorkspacePage.js';
import { deserializeCompactDocument } from '../js/core/documentSerialization.js';
import { toMathJSON } from '../js/core/mathJson.js';

const fixtureURL = new URL('./fixtures/multi-object-branching.json', import.meta.url);

test('students can visit sibling history branches after import and reload', async ({ page }) => {
  const fixture = JSON.parse(await readFile(fixtureURL, 'utf8'));
  const document = fixture.document;
  const object = document.objects[document.activeObjectId];
  const hydrated = deserializeCompactDocument(fixture);
  const snapshots = new Map(hydrated.objects[document.activeObjectId].history.nodes.map(node => [node.id, node.snapshot]));
  const branches = object.history.nodes.filter(node => node.parentId !== null);
  expect(branches).toHaveLength(2); // Guard against accidentally changing the fixture.

  await page.goto('/');
  await page.locator('#workspaceImport').setInputFiles({
    name: 'multi-object-branching.json', mimeType: 'application/json',
    buffer: await readFile(fixtureURL)
  });
  await expect(page.locator('#workspaceStatus')).toContainText('Imported');
  const math = new WorkspacePage(page).activeWindow();
  await page.locator('#historyToggle').click();

  for (const branch of branches) {
    const button = page.locator(`#historyTree [data-history-id="${branch.id}"]`);
    await button.click();
    await expect(button).toHaveAttribute('aria-current', 'true');
    // The selected history state is independent of the currently loaded branch.
    const active = object.history.nodes.find(node => node.id === branch.id);
    expect(active.snapshot).toBeUndefined(); // Compact fixture stores only events.
    await expect.poll(async () => JSON.parse(await math.astText())).toEqual(toMathJSON(snapshots.get(branch.id).expression));
    await expect.poll(() => math.historyCount()).toBe(object.history.nodes.length);
  }

  await page.reload();
  await page.getByRole('button', { name: /Branching fixture \(imported\)/ }).click();
  await page.locator('#historyToggle').click();
  const last = branches.at(-1);
  await expect(page.locator(`#historyTree [data-history-id="${last.id}"]`)).toHaveAttribute('aria-current', 'true');
});
