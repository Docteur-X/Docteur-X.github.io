/**
 * D9: the rearrangement preview and the drag ghost are copies attached to
 * <body>, outside #equation. They carry .math-scope, so nested boxes keep the
 * size they have in the equation instead of growing to full-size terms.
 *
 * D10: dragging −1 onto the + of a bracketed sum offers distribution, not
 * negation (fixed by R1: the + belongs to the sum's own box, not the bracket).
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';

async function start(page, expression) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Drag copies');
  const math = workspace.activeWindow();
  await math.build(expression);
  return math;
}
const size = locator => locator.evaluate(el => {
  const r = el.getBoundingClientRect();
  return { width: r.width, height: r.height, padding: getComputedStyle(el).padding };
});

test('D9: a nested box keeps its padding in the preview copy and the ghost', async ({ page }) => {
  const math = await start(page, '2(x + -y)');
  const negY = math.view.locator('.nested-operation .add-operand').nth(1);
  const x = math.view.locator('.nested-operation .add-operand').nth(0);
  await negY.scrollIntoViewIfNeeded();
  const original = await size(negY.locator('.nested-occurrence'));
  const from = await negY.boundingBox();
  const to = await x.boundingBox();
  // Press on the edge of −y (its middle is the minus sign or the nested y).
  await page.mouse.move(from.x + from.width - 4, from.y + 6);
  await page.mouse.down();
  await page.mouse.move(to.x + 5, to.y + to.height / 2, { steps: 15 });
  await expect.poll(() => page.evaluate(() => window.manipulatorDiagnostics.mode())).toBe('dragging');
  for (const copy of ['.drag-rearrangement-preview', '.drag-ghost']) {
    const nested = page.locator(`${copy} .nested-occurrence`).first();
    await expect(nested).toBeVisible();
    const measured = await size(nested);
    expect(measured.padding, copy).toBe(original.padding);
    expect(Math.abs(measured.width - original.width), copy).toBeLessThan(8);
    expect(Math.abs(measured.height - original.height), copy).toBeLessThan(8);
  }
  await page.mouse.up();
});

test('D10: −1 dropped on the + of a bracketed sum offers distribution, not negation', async ({ page }) => {
  const math = await start(page, '-1(a+b)');
  const minusOne = math.view.locator('.factor-slot').first();
  const plus = math.view.locator('.nested-operation .plus').first();
  await minusOne.scrollIntoViewIfNeeded();
  const from = await minusOne.boundingBox();
  const to = await plus.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await expect(math.view.locator('.plus--distribution-drop')).toHaveCount(1);
  await expect(math.view.locator('.math-feedback--eligible')).toHaveCount(0);
  await page.mouse.up();
  await expect(math.view.locator('.distribution-preview__copy').first()).toBeVisible();
});
