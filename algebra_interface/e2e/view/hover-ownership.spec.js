/**
 * D8 (fixed in stage 5 with renderer decision R1): a nested sum or product has
 * its own box, invisible until hovered.
 * - Pointing at the + of the sum inside brackets lights that sum, never the
 *   whole bracket.
 * - During a drag no ordinary hover glow shows behind the floating copy.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';

async function setup(page) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('D8');
  const math = workspace.activeWindow();
  await math.build('2(x + -y)');
  return math;
}
const paint = locator => locator.evaluate(el => {
  const style = getComputedStyle(el);
  return `${style.backgroundColor}|${style.boxShadow}`;
});

test('D8: hovering the + inside brackets lights the sum, not the bracket', async ({ page }) => {
  const math = await setup(page);
  const bracket = math.view.locator('.term--compound').first();
  const sum = math.view.locator('.nested-operation');
  await expect(sum).toHaveCount(1);
  // The bracket's own glow, for comparison: hover its bracket character.
  await bracket.locator('.expression-bracket').first().hover();
  await page.waitForTimeout(400); // let the .16s colour transition finish
  const bracketGlow = await paint(bracket);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  const sumAtRest = await paint(sum);
  await math.view.locator('.nested-operation .plus').first().hover();
  await page.waitForTimeout(400);
  expect(await paint(sum)).not.toBe(sumAtRest);
  expect(await paint(bracket)).not.toBe(bracketGlow);
});

test('D8: during a drag no hover glow shows on the bracket or the sum', async ({ page }) => {
  const math = await setup(page);
  const bracket = math.view.locator('.term--compound').first();
  const sum = math.view.locator('.nested-operation');
  // The two glows to look for: the bracket's (hovering its own bracket
  // character) and the sum's (hovering its own +), both while idle.
  await bracket.locator('.expression-bracket').first().hover();
  await page.waitForTimeout(400);
  const bracketGlow = await paint(bracket);
  await math.view.locator('.nested-operation .plus').first().hover();
  await page.waitForTimeout(400);
  const sumGlow = await paint(sum);
  await page.mouse.move(0, 0);
  const x = math.view.locator('.nested-operation .add-operand').first();
  await x.scrollIntoViewIfNeeded();
  const box = await x.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // End over the sum's + (where D8 was reported), then hold.
  for (let i = 1; i <= 6; i++) await page.mouse.move(box.x + box.width / 2 + i * 6, box.y + box.height / 2 + 1);
  // Assert the drag really started before judging the picture.
  await expect.poll(() => page.evaluate(() => window.manipulatorDiagnostics.mode())).toBe('dragging');
  await page.waitForTimeout(400);
  expect(await paint(bracket)).not.toBe(bracketGlow);
  expect(await paint(sum)).not.toBe(sumGlow);
  await page.mouse.up();
});

// Owner decision (12 November 2026): a click on a gap between the children of
// a nested sum or product selects that sum or product, not the bracket.
test('a click on the gap inside brackets selects the nested product', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Gap');
  const math = workspace.activeWindow();
  await math.build('a+(b c)');
  const history = await math.historyCount();
  const product = math.view.locator('.nested-operation');
  const b = product.locator('.factor-slot').nth(0);
  const c = product.locator('.factor-slot').nth(1);
  await product.scrollIntoViewIfNeeded();
  const left = await b.boundingBox();
  const right = await c.boundingBox();
  await page.mouse.click((left.x + left.width + right.x) / 2, left.y + left.height / 2);
  await expect(math.view.locator('.is-selected')).toHaveCount(1);
  await expect(product).toHaveClass(/is-selected/);
  // ...and the selection is visible: the box has a ring, though it has no border.
  await page.mouse.move(0, 0);
  await expect.poll(() => product.evaluate(e => getComputedStyle(e).boxShadow)).not.toBe('none');
  // Clicking a term inside still selects that term.
  await b.click();
  await expect(math.view.locator('.is-selected')).toHaveCount(1);
  await expect(math.view.locator('.nested-operation .factor-slot').nth(0)).toHaveClass(/is-selected/);
  expect(await math.historyCount()).toBe(history);
});
