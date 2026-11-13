/**
 * Stage 7 rule bundle js/rules/both-sides: drag a term across = to add its
 * opposite to both sides. Preview first; amber or Confirm commits one step.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';

async function setup(page) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Both sides');
  const math = workspace.activeWindow();
  await math.build('a+b=c');
  return math;
}

async function dragAcross(page, math) {
  const b = math.view.locator('.add-operand').filter({ hasText: /^b$/ }).first();
  const right = math.view.locator('.relation-root > .expression-root').last();
  await b.scrollIntoViewIfNeeded();
  const from = await b.boundingBox();
  const to = await right.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 3 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  // The drag really started (lesson 5: probes assert the state they test).
  expect(await page.evaluate(() => window.manipulatorDiagnostics.mode())).toBe('dragging');
  await expect(page.locator('#statusMessage')).toContainText('to both sides');
  await page.mouse.up();
}

test('dragging b across = previews −b on both sides; amber confirms one step', async ({ page }) => {
  const math = await setup(page);
  const before = await math.historyCount();
  await dragAcross(page, math);
  await expect(page.getByTestId('both-sides-preview')).toBeVisible();
  const amber = math.view.locator('[data-preview-confirm="true"]');
  await expect(amber).toHaveCount(2);
  await amber.first().click();
  await expect(page.getByTestId('both-sides-preview')).toHaveCount(0);
  await expect(page.locator('#expressionInput')).toHaveValue('a+b+-b=c+-b');
  expect(await math.historyCount()).toBe(before + 1);
});

test('Escape cancels the preview and changes nothing', async ({ page }) => {
  const math = await setup(page);
  const before = await math.historyCount();
  await dragAcross(page, math);
  await expect(page.getByTestId('both-sides-preview')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('both-sides-preview')).toHaveCount(0);
  await expect(page.locator('#expressionInput')).toHaveValue('a+b=c');
  expect(await math.historyCount()).toBe(before);
});

test('a single-term side can be dragged across too: x = 2y+3', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Single side');
  const math = workspace.activeWindow();
  await math.build('x=2y+3');
  const x = math.view.locator('.relation-root > .expression-root').first().locator('[data-hitbox-role="occurrence"]').first();
  const right = math.view.locator('.relation-root > .expression-root').last();
  await x.scrollIntoViewIfNeeded();
  const from = await x.boundingBox();
  const to = await right.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 15, from.y + from.height / 2, { steps: 3 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  expect(await page.evaluate(() => window.manipulatorDiagnostics.mode())).toBe('dragging');
  await page.mouse.up();
  await math.view.locator('[data-preview-confirm="true"]').first().click();
  await expect(page.locator('#expressionInput')).toHaveValue('x+-x=2 y+3+-x');
});

test('"what can I do here?" offers it only on terms of an equation side', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Declarations');
  const math = workspace.activeWindow();
  await math.build('2(x+3)+b=y');
  const offers = locator => locator.evaluate(element =>
    window.manipulatorDiagnostics.gesturesAt(element).map(gesture => gesture.ruleId));
  const left = math.view.locator('.relation-root > .expression-root').first();
  // b is a term of the left side: offered.
  expect(await offers(left.locator('.add-operand').filter({ hasText: /^b$/ }).first())).toContain('equality.add-opposite');
  // x is inside brackets: not offered (before, the declaration overclaimed here).
  expect(await offers(left.locator('[data-node-id]').filter({ hasText: /^x$/ }).first())).not.toContain('equality.add-opposite');
  // y is a whole side: offered.
  const y = math.view.locator('.relation-root > .expression-root').last().locator('[data-hitbox-role="occurrence"]').first();
  expect(await offers(y)).toContain('equality.add-opposite');
});

