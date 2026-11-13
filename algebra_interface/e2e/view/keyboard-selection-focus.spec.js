import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';

/** Selection rerenders semantic hitboxes; focus must follow the stable ID. */
test('keyboard selection preserves focus on the same occurrence after rerender', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Keyboard selection focus');
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  const first = math.operand(0);
  const nodeId = await first.getAttribute('data-node-id');
  const historyBefore = await math.historyCount();
  const expressionBefore = await math.astText();
  await first.focus();
  await page.keyboard.press('Enter');
  const replacement = math.view.locator(`.add-operand[data-node-id="${nodeId}"]`);
  await expect(replacement).toHaveClass(/is-selected/);
  await expect(replacement).toBeFocused();
  expect(await math.historyCount()).toBe(historyBefore);
  expect(await math.astText()).toBe(expressionBefore);
  // The newly mounted hitbox must remain usable for another keyboard command.
  await page.keyboard.press('Enter');
  await expect(replacement).toBeFocused();
});

/** Space uses the same selection path as Enter. A rerender must not shift the
 * equation or orphan the keyboard target, even when the same node is selected
 * repeatedly. This tests actual browser layout, not just AST equality. */
test('Space selection retains occurrence geometry and keyboard focus across repeated mounts', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Space focus and geometry');
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  const target = math.operand(1);
  const id = await target.getAttribute('data-node-id');
  const expression = await math.astText();
  const history = await math.historyCount();
  // Playwright focus may scroll the workspace. Establish the baseline only
  // after focus has settled, so focus-induced scrolling is not attributed to
  // the subsequent rerender.
  await target.focus();
  const before = await target.boundingBox();
  const replacement = math.view.locator(`.add-operand[data-node-id="${id}"]`);
  for (let iteration = 0; iteration < 2; iteration += 1) {
    await page.keyboard.press('Space');
    await expect(replacement).toBeFocused();
    await expect(replacement).toHaveClass(/is-selected/);
    const after = await replacement.boundingBox();
    expect(after).not.toBeNull();
    expect(after.x).toBeCloseTo(before.x, 1);
    expect(after.y).toBeCloseTo(before.y, 1);
    expect(after.width).toBeCloseTo(before.width, 1);
    expect(after.height).toBeCloseTo(before.height, 1);
    expect(await math.astText()).toBe(expression);
    expect(await math.historyCount()).toBe(history);
  }
});
