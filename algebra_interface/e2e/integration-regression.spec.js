import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { WorkspacePage } from './pages/WorkspacePage.js';
import { expectMathJSON } from './support/mathAssertions.js';

const fixture = name => new URL(`./fixtures/${name}`, import.meta.url);
async function importFixture(page, name) {
  await page.locator('#workspaceImport').setInputFiles({
    name, mimeType: 'application/json', buffer: await readFile(fixture(name))
  });
  await expect(page.locator('#workspaceStatus')).toContainText('Imported');
}
async function exportPayload(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'), page.locator('#workspaceExport').click()
  ]);
  return JSON.parse(await readFile(await download.path(), 'utf8'));
}

test('legacy v1 fixture imports, migrates and exports without changing mathematics', async ({page}) => {
  await page.goto('/');
  await importFixture(page, 'legacy-v1.json');
  await expectMathJSON(new WorkspacePage(page).activeWindow(), ['Add','a','b']);
  const payload = await exportPayload(page);
  expect(payload.formatVersion).toBe(1);
  expect(payload.document.schemaVersion).toBe(2);
  expect(payload.document.objectOrder).toHaveLength(1);
  await page.reload();
  await expect(page.getByRole('button', {name:/Historical v1 fixture \(imported\)/})).toBeVisible();
});

test('multi-object branching fixture survives import, export and browser reload', async ({page}) => {
  await page.goto('/');
  const original = JSON.parse(await readFile(fixture('multi-object-branching.json'),'utf8'));
  await importFixture(page, 'multi-object-branching.json');
  const exported = await exportPayload(page);
  expect(exported.document.objectOrder).toEqual(original.document.objectOrder);
  expect(exported.document.activeObjectId).toBe(original.document.activeObjectId);
  for (const id of original.document.objectOrder) {
    expect(exported.document.objects[id].history).toEqual(original.document.objects[id].history);
    expect(exported.document.objects[id].root).toEqual(original.document.objects[id].root);
    expect(exported.document.objects[id].substitutions).toEqual(original.document.objects[id].substitutions);
  }
  await page.reload();
  await page.getByRole('button',{name:/Branching fixture \(imported\)/}).click();
  const afterReload = await exportPayload(page);
  for (const id of original.document.objectOrder) {
    expect(afterReload.document.objects[id].history).toEqual(original.document.objects[id].history);
  }
});

test('failed IndexedDB import write does not activate or list imported document', async ({page}) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Keep active on write failure');
  await workspace.activeWindow().build('a+b');
  await expectMathJSON(workspace.activeWindow(), ['Add','a','b']);
  const historyCount = await workspace.activeWindow().historyCount();
  await page.locator('#workspaceSave').click();
  await expect(page.locator('#workspaceStatus')).toContainText('Saved');
  // Inject a failure only for imported-document puts, after the initial save.
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, ...args) {
      if (typeof value?.title === 'string' && value.title.endsWith(' (imported)')) {
        const request = original.call(this, value, ...args);
        this.transaction.abort(); // Request exists, but its transaction must not commit.
        return request;
      }
      return original.call(this, value, ...args);
    };
  });
  await page.locator('#workspaceImport').setInputFiles({
    name:'legacy-v1.json', mimeType:'application/json', buffer:await readFile(fixture('legacy-v1.json'))
  });
  await expect(page.locator('#workspaceStatus')).toContainText('Import failed');
  await expectMathJSON(workspace.activeWindow(), ['Add','a','b']);
  expect(await workspace.activeWindow().historyCount()).toBe(historyCount);
  await expect(page.getByRole('button',{name:'Keep active on write failure'})).toBeVisible();
  await expect(page.getByRole('button',{name:/Historical v1 fixture \(imported\)/})).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button',{name:/Historical v1 fixture \(imported\)/})).toHaveCount(0);
});
