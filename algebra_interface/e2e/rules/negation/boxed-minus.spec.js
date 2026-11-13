/**
 * a − b drawn as [a] [−] [b] (owner, 14 November 2026). The sum's + before a
 * negative term shows a boxed − in the operator position; the term's own
 * minus is hidden. The boxed − is still the sum's operator (hover, drops) and
 * a click or Enter on it does what the term's minus did.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';

async function setup(page, expression) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Boxed minus');
  const math = workspace.activeWindow();
  await math.build(expression);
  return math;
}

test('a − b shows one boxed − between the terms and hides the term\'s own sign', async ({ page }) => {
  const math = await setup(page, 'a+-b+-3y');
  const boxed = math.view.locator('.plus[data-before-negative]');
  await expect(boxed).toHaveCount(2);
  for (const sign of await boxed.all()) {
    const drawn = await sign.evaluate(el => getComputedStyle(el, '::before').content);
    expect(drawn).toBe('"−"');
  }
  await expect(math.view.locator('[data-leading-sign]').first()).toBeHidden();
  await expect(math.view.locator('[data-leading-sign]')).toHaveCount(2);
});

test('Enter on the boxed − opens the minus\'s own preview; Escape leaves the tree unchanged', async ({ page }) => {
  const math = await setup(page, 'a+-(b+c)');
  const before = await math.astText();
  const boxed = math.view.locator('.plus[data-stands-for-minus]');
  await boxed.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/becomes −1/)).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await math.astText()).toBe(before);
});

test('the tree view (a + −b) keeps the + and the term\'s own minus', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('algebra-subtraction', 'tree'));
  const math = await setup(page, 'a+-b');
  await expect(math.view.locator('.negate-operator-hitbox')).toBeVisible();
  await expect(math.view.locator('.plus')).toHaveText('+');
});
