import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';
import { beginPointerDrag, movePointerTo } from '../../support/pointerGestures.js';
import { expectOneCommit, expectMathJSON } from '../../support/mathAssertions.js';

test('rearrangement: transient proposal before drop, then one history commit', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  const before = await math.astText();
  const count = await math.historyCount();
  const source = math.operand(0);
  // Aim for the insertion gap between b and c; never drag onto b's centre.
  const target = math.view.locator('.plus').nth(1);
  const { targetBox } = await beginPointerDrag(page, source, target);
  await movePointerTo(page, targetBox);
  await expect(page.locator('.drag-ghost')).toBeVisible();
  expect(await math.astText()).toBe(before);
  // A visible overlay can still be transitioning. The app intentionally refuses
  // drops until the student has seen the settled ordering; wait for that state.
  const preview = page.locator('.drag-rearrangement-preview');
  await expect(preview).toBeVisible();
  await expect.poll(async () => preview.evaluate(element =>
    element.getAnimations({ subtree: true }).every(animation =>
      animation.playState === 'finished' || animation.playState === 'idle'
    )
  )).toBe(true);

  // Release over the *visible* moving operand, which is an explicitly valid
  // insertion target after the preview settles. The original hitboxes remain
  // stationary underneath the decorative overlay.
  const sourceId = await source.getAttribute('data-node-id');
  const moving = preview.locator(`.add-operand[data-node-id="${sourceId}"]`);
  await expect(moving).toBeVisible();
  const settled = await moving.boundingBox();
  if (!settled) throw new Error('Settled rearrangement has no visible moving operand');
  await page.mouse.move(settled.x + settled.width / 2, settled.y + settled.height / 2);
  // Allow the preview's onSettled microtask and final pointer-target update.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() =>
    requestAnimationFrame(resolve))));
  expect(await math.astText()).toBe(before);
  await page.mouse.up();
  await expectOneCommit(math, before, count);
  await expectMathJSON(math, ['Add', 'b', 'a', 'c']);
});
