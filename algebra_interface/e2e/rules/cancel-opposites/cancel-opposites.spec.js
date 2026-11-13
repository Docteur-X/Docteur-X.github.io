/**
 * Rule bundle js/rules/cancel-opposites, and the whole "move a term across"
 * story it completes: three rules, each one visible step.
 *   a+b=c  --drag b across =-->  a+b+−b = c+−b     (both-sides, preview)
 *          --drop b onto −b-->   a+0 = c+−b        (cancel-opposites)
 *          --drop 0 onto a-->    a = c+−b          (numeric combination)
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';

async function drag(page, from, to) {
  await from.scrollIntoViewIfNeeded();
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  // The drag really started (lesson 5).
  expect(await page.evaluate(() => window.manipulatorDiagnostics.mode())).toBe('dragging');
}
const leftSide = math => math.view.locator('.relation-root > .expression-root').first();
const term = (scope, text) => scope.locator('[data-hitbox-role="occurrence"][data-node-id]').filter({ hasText: text });

test('move a term across =, cancel it to 0, then remove the 0', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Opposites');
  const math = workspace.activeWindow();
  await math.build('a+b=c');
  const start = await math.historyCount();

  // 1. Drag b across = and confirm the preview (both-sides).
  await drag(page, term(leftSide(math), /^b$/).first(), math.view.locator('.relation-root > .expression-root').last());
  await page.mouse.up();
  await math.view.locator('[data-preview-confirm="true"]').first().click();
  await expect(page.locator('#expressionInput')).toHaveValue('a+b+-b=c+-b');

  // 2. Drop b onto −b: the green glow names the result, release commits.
  const b = term(leftSide(math), /^b$/).first();
  const minusB = leftSide(math).locator('.add-operand').filter({ hasText: /^−\s*b$/ }).first();
  await drag(page, b, minusB);
  await expect(page.locator('#statusMessage')).toContainText('= 0');
  await page.mouse.up();
  await expect(page.locator('#expressionInput')).toHaveValue('a+0=c+-b');

  // 3. Drop the 0 onto a: numeric combination removes it.
  await drag(page, term(leftSide(math), /^0$/).first(), term(leftSide(math), /^a$/).first());
  await page.mouse.up();
  await expect(page.locator('#expressionInput')).toHaveValue('a=c+-b');
  expect(await math.historyCount()).toBe(start + 3);
});

test('two terms that are not opposites do not glow, and nothing changes', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Not opposites');
  const math = workspace.activeWindow();
  await math.build('a+b');
  await drag(page, term(math.view, /^a$/).first(), term(math.view, /^b$/).first());
  await expect(page.locator('#statusMessage')).not.toContainText('= 0');
  await page.mouse.up();
  await expect(page.locator('#expressionInput')).toHaveValue('a+b');
});
