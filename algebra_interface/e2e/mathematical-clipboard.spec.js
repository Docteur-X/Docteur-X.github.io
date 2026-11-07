import { test, expect } from '@playwright/test';
import { WorkspacePage } from './pages/WorkspacePage.js';

/**
 * Browser contract: copying remembers an immutable operand, not a new object.
 * Clipboard presentation is shared across documents and deliberately transient.
 */
test('copy remembers mathematical content without creating another object', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('x+2=3');
  const before = await math.astText();
  const history = await math.historyCount();
  const objects = await page.locator('#objectList [data-object-id]').count();
  await page.locator('#copyMathButton').click();
  await expect(page.locator('#clipboardCount')).toHaveText('1');
  await page.locator('#clipboardPanel summary').click();
  await expect(page.locator('#clipboardEntries [role=listitem]')).toHaveCount(1);
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
  await expect(page.locator('#objectList [data-object-id]')).toHaveCount(objects);
  await page.locator('#copyMathButton').click();
  await expect(page.locator('#clipboardCount')).toHaveText('2');
  await page.locator('#clipboardEntries [role=listitem]').first().locator('button').first().click();
  await expect(page.locator('#clipboardEntries [aria-pressed=true]')).toHaveCount(1);
  await page.locator('#clipboardClear').click();
  await expect(page.locator('#clipboardCount')).toHaveText('0');
});
