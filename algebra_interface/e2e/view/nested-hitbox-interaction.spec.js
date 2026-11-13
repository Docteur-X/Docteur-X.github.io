import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';

/**
 * Nested Hitbox Interaction Refinement v1.
 * Test real target resolution and drag geometry, not just the existence of
 * nested data-node-id attributes. A nested Group is NOT an Add sibling and
 * selecting it must never accidentally start a drag of its outer Group.
 */
test('each bracket level and its inner number can be selected independently', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('(((30)))');
  const initialHistory = await math.historyCount();
  const ids = await math.view.locator('[data-hitbox-role="occurrence"][data-node-id]')
    .evaluateAll(elements => elements.map(element => element.dataset.nodeId));
  expect(new Set(ids).size).toBe(4);

  // Clicking the inner numeral must not be promoted to its draggable ancestor.
  await math.node(ids[3]).click();
  await expect(math.node(ids[3])).toHaveClass(/is-selected/);
  await expect(math.node(ids[0])).not.toHaveClass(/is-selected/);

  // This includes the outermost Group, which is now the natural AST root.
  // A root Group must be selectable just like a nested Group, without an
  // artificial one-operand Add parent and without adding a history event.
  // Each pair of brackets has its own exposed bracket area. Target the opening
  // glyph specifically to avoid accidentally clicking a descendant hitbox.
  for (const id of [ids[2], ids[1], ids[0]]) {
    const group = math.node(id);
    await group.locator(':scope > .group-content > .expression-bracket').first().click();
    await expect(math.node(id)).toHaveClass(/is-selected/);
  }
  expect(await math.historyCount()).toBe(initialHistory);
});

test('drag ghost stays the same size as a deeply grouped source occurrence', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a+((((30))))+b');
  const group = math.view.locator('.add-operand').nth(1);
  const original = await group.boundingBox();
  expect(original).toBeTruthy();
  const history = await math.historyCount();
  // Start on the OUTER Group's opening bracket, which belongs to the
  // draggable Add operand itself. An arbitrary point within its bounding box
  // can land on a nested-occurrence; the app intentionally treats that as an
  // independent selection target and refuses to drag its ancestor.
  const outerBracket = group.locator(':scope > .group-content > .expression-bracket').first();
  await outerBracket.scrollIntoViewIfNeeded();
  const bracketBox = await outerBracket.boundingBox();
  expect(bracketBox).toBeTruthy();
  const x = bracketBox.x + bracketBox.width / 2;
  const y = bracketBox.y + bracketBox.height / 2;
  await page.mouse.move(x, y);
  // Verify the real hit-test target, rather than manufacturing a drag state.
  expect(await page.evaluate(({ x, y }) => {
    const hit = document.elementFromPoint(x, y);
    return Boolean(hit?.closest('.add-operand')) &&
      !Boolean(hit?.closest('.nested-occurrence[data-node-id]'));
  }, { x, y })).toBe(true);
  await page.mouse.down();
  await page.mouse.move(x + 24, y + 16, { steps: 8 });
  const ghost = page.locator('.drag-ghost');
  await expect(ghost).toBeVisible();
  const ghostBox = await ghost.boundingBox();
  expect(Math.abs(ghostBox.width - original.width)).toBeLessThan(2);
  expect(Math.abs(ghostBox.height - original.height)).toBeLessThan(2);
  await page.keyboard.press('Escape');
  await expect(ghost).toHaveCount(0);
  expect(await math.historyCount()).toBe(history);
});
