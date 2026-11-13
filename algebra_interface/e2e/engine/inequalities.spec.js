/**
 * Inequalities (stage E4c): < and > are relation folders. They are drawn
 * with their own sign, and the both-sides rule serves them as it serves =.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';

async function setup(page, expression) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Inequalities');
  const math = workspace.activeWindow();
  await math.build(expression);
  return math;
}

test('x+2<5 is drawn with its < sign, spoken "is less than"', async ({ page }) => {
  const math = await setup(page, 'x+2<5');
  const sign = math.view.locator('.relation-sign');
  await expect(sign).toHaveText('<');
  await expect(sign).toHaveAttribute('aria-label', 'is less than: operation menu');
});

test('dragging 2 across < adds −2 to both sides and keeps <', async ({ page }) => {
  const math = await setup(page, 'x+2<5');
  const two = math.view.locator('.add-operand').filter({ hasText: /^2$/ }).first();
  const right = math.view.locator('.relation-root > .expression-root').last();
  await two.scrollIntoViewIfNeeded();
  const from = await two.boundingBox();
  const to = await right.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 3 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  expect(await page.evaluate(() => window.manipulatorDiagnostics.mode())).toBe('dragging');
  await expect(page.locator('#statusMessage')).toContainText('to both sides');
  await page.mouse.up();
  await expect(page.getByTestId('both-sides-preview')).toBeVisible();
  await page.getByTestId('both-sides-preview').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('#expressionInput')).toHaveValue('x+2+-2<5+-2');
  await expect(page.locator('#statusMessage')).toContainText('The statement still holds');
});
