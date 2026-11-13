import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';
import { beginPointerDrag, movePointerTo } from '../../support/pointerGestures.js';
import { expectOneCommit, expectMathJSON } from '../../support/mathAssertions.js';

test('drag factor onto +: amber preview, then commit distribution', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a*(b+c)');
  const before = await math.astText();
  const count = await math.historyCount();
  const source = math.view.locator('.factor-slot').first();
  const plus = math.view.locator('.plus').first();
  const { targetBox } = await beginPointerDrag(page, source, plus);
  await movePointerTo(page, targetBox);
  await expect(math.view.locator('.plus--distribution-drop')).toBeVisible();
  expect(await math.astText()).toBe(before);
  await page.mouse.up();
  await expect(math.view.locator('.distribution-preview__copy').first()).toBeVisible();
  expect(await math.astText()).toBe(before);
  await math.view.locator('.distribution-preview__copy').first().click();
  await expectOneCommit(math, before, count);
  await expectMathJSON(math, ['Add', ['Multiply', 'a', 'b'], ['Multiply', 'a', 'c']]);
});
