/**
 * T4-4 (defect D7): a release must not depend on how long the pointer rested.
 *
 * These tests deliberately release WITHOUT first waiting for target feedback.
 * Other drag tests wait for it, which is how D7 went unnoticed. A validated
 * target is honoured at once; a rearrangement must still be seen before it can
 * commit, so the last test pins that opposite rule.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';
import { beginPointerDrag, movePointerTo } from '../support/pointerGestures.js';
import { expectMathJSON } from '../support/mathAssertions.js';

async function start(page, expression) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Quick release');
  const math = workspace.activeWindow();
  await math.build(expression);
  return math;
}

async function quickDistribution(page, math) {
  const { targetBox } = await beginPointerDrag(page,
    math.view.locator('.factor-slot').first(), math.view.locator('.plus').first());
  await movePointerTo(page, targetBox);
  await page.mouse.up();
}

test('quick release on + opens distribution, on first and second drags', async ({ page }) => {
  const math = await start(page, 'a*(b+c)');
  const copies = math.view.locator('.distribution-preview__copy');
  await quickDistribution(page, math);
  await expect(copies.first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(copies).toHaveCount(0);
  await quickDistribution(page, math);
  await expect(copies.first()).toBeVisible();
});

test('moving without leaving the source position starts no rearrangement preview', async ({ page }) => {
  const math = await start(page, 'a*(b+c)');
  const source = math.view.locator('.factor-slot').first();
  await source.scrollIntoViewIfNeeded();
  const box = await source.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  // Far enough to begin a drag, but still nearest the source's own position.
  await page.mouse.move(x - 10, y, { steps: 4 });
  await expect(page.locator('.drag-ghost')).toBeVisible();
  await expect(page.locator('.drag-rearrangement-preview')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.mouse.up();
});

test('quick release on a numeric target combines once',async ({ page }) => {
  const math = await start(page, '3+5+x');
  const history = await math.historyCount();
  const { targetBox } = await beginPointerDrag(page, math.operand(0), math.operand(1));
  await movePointerTo(page, targetBox);
  await page.mouse.up();
  await expectMathJSON(math, ['Add', 8, 'x']);
  expect(await math.historyCount()).toBe(history + 1);
});

test('release on + right after a rearrangement preview still opens distribution', async ({ page }) => {
  const math = await start(page, 'a*(b+c)*d');
  const source = math.view.locator('.factor-slot').first();
  const plus = math.view.locator('.plus').first();
  const last = math.view.locator('.factor-slot').last();
  const { targetBox: plusBox } = await beginPointerDrag(page, source, plus);
  const lastBox = await last.boundingBox();
  // Beyond the last factor is a genuine insertion gap: wait until the blue
  // preview is really showing, so a return animation must follow.
  await page.mouse.move(lastBox.x + lastBox.width + 8, lastBox.y + lastBox.height / 2, { steps: 8 });
  await expect(page.locator('.drag-rearrangement-preview')).toBeVisible();
  await page.waitForFunction(() => document.querySelector('.drag-rearrangement-preview')
    ?.getAnimations({ subtree: true }).length === 0);
  // Leave the preview, which starts its return animation, then reach the +
  // while that animation runs. While a preview is still showing, the +'s normal
  // position can legitimately mean a rearrangement, so it would be ambiguous.
  await page.mouse.move(lastBox.x, lastBox.y + lastBox.height + 120);
  // One direct move: intermediate positions could cross a gap and start a new preview.
  await page.mouse.move(plusBox.x + plusBox.width / 2, plusBox.y + plusBox.height / 2);
  await page.mouse.up();
  await expect(math.view.locator('.distribution-preview__copy').first()).toBeVisible();
  await expect(page.locator('.drag-rearrangement-preview')).toHaveCount(0);
});

test('quick release on an unseen rearrangement does not commit', async ({ page }) => {
  const math = await start(page, 'a+b+c');
  const before = await math.astText();
  const history = await math.historyCount();
  const lastBox = await math.operand(2).boundingBox();
  await beginPointerDrag(page, math.operand(0), math.operand(2));
  await page.mouse.move(lastBox.x + lastBox.width + 8, lastBox.y + lastBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('.drag-ghost')).toHaveCount(0);
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
});
