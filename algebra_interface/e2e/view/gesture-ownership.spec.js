/**
 * Phase 3A: browser characterization of existing gesture ownership.
 *
 * These are deliberately black-box contracts, not tests of a proposed arbiter.
 * They use real pointer/keyboard events and compare AST/history before and
 * after cancellation. No production gesture logic is modified in Phase 3A.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';

async function fixture(page, expression) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build(expression);
  return { math, before: await math.astText(), history: await math.historyCount() };
}

async function beginVisibleDrag(page, operand) {
  await operand.scrollIntoViewIfNeeded();
  const box = await operand.boundingBox();
  expect(box).toBeTruthy();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 35, y + 18, { steps: 8 });
  await expect(page.locator('.drag-ghost')).toBeVisible();
}

test('Escape releases ordinary drag ownership without changing AST or history', async ({ page }) => {
  const { math, before, history } = await fixture(page, 'a+b+c');
  await beginVisibleDrag(page, math.operand(0));
  await page.keyboard.press('Escape');
  await expect(page.locator('.drag-ghost')).toHaveCount(0);
  await page.mouse.up(); // A subsequent release must not commit a cancelled session.
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
});

test('window blur cancels a drag and later pointer release cannot commit', async ({ page }) => {
  const { math, before, history } = await fixture(page, 'a+b+c');
  await beginVisibleDrag(page, math.operand(0));
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('.drag-ghost')).toHaveCount(0);
  await page.mouse.up();
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
});

test('structural negation operator owns activation rather than starting operand drag', async ({ page }) => {
  const { math, before, history } = await fixture(page, 'a+-(b+c)');
  await math.minusSign().click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  await expect(page.locator('.drag-ghost')).toHaveCount(0);
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
  await page.getByTestId('cancel-negation').click();
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
  expect(await math.historyCount()).toBe(history);
});

test('pointercancel releases an ordinary drag without publishing a transformation', async ({ page }) => {
  const { math, before, history } = await fixture(page, 'a+b+c');
  await page.evaluate(() => {
    window.__phase3aPointerId = null;
    document.addEventListener('pointerdown', event => {
      window.__phase3aPointerId = event.pointerId;
    }, { capture: true, once: true });
  });
  await beginVisibleDrag(page, math.operand(0));
  // Browser-synthesized pointercancel on the window exercises the app's
  // cancellation listener using the pointerId from the active mouse session.
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel', {
    bubbles: true, pointerId: window.__phase3aPointerId, pointerType: 'mouse'
  }))); 
  await expect(page.locator('.drag-ghost')).toHaveCount(0);
  await page.mouse.up();
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
});
