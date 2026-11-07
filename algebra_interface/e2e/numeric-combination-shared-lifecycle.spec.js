import { test, expect } from '@playwright/test';
import { WorkspacePage } from './pages/WorkspacePage.js';
import { beginPointerDrag, movePointerTo } from './support/pointerGestures.js';
import { expectOneCommit, expectMathJSON } from './support/mathAssertions.js';

/** Numerical combination has immediate drop confirmation, but no mutation
 * should occur during the green eligible-hover state. Synchronize on actual
 * feedback, not a fixed timeout, before releasing the pointer. */
test('numeric addition combines on drop with exactly one history event', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('3+5+x');
  const before = await math.astText();
  const count = await math.historyCount();
  const source = math.operand(0);
  const target = math.operand(1);
  const { targetBox } = await beginPointerDrag(page, source, target);
  await movePointerTo(page, targetBox);
  // A green eligible target is the public indication that the Gesture
  // Interpreter has resolved a numeric combination.
  await expect(target).toHaveClass(/is-combine-target/);
  expect(await math.astText()).toBe(before);
  await page.mouse.up();
  await expectOneCommit(math, before, count);
  await expectMathJSON(math, ['Add', 8, 'x']);
});
