/**
 * Defined functions in the browser (stage E4a): typed \sin(x), brackets
 * always (owner decision, 12 November 2026). The name is drawn upright as the
 * function's operator; each argument has its own box inside the brackets.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';

async function setup(page, expression) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Functions');
  const math = workspace.activeWindow();
  await math.build(expression);
  return math;
}

test('2\\sin(a+b) draws the function with its argument inside its own brackets', async ({ page }) => {
  const math = await setup(page, '2\\sin(a+b)');
  await expect(math.view.locator('.apply-name')).toHaveText('sin');
  await expect(math.view.locator('.apply-name')).toHaveAttribute('data-operator-kind', 'function');
  const content = math.view.locator('.apply-content');
  await expect(content).toContainText('sin(a+b)');
  // The argument a+b is a box of its own, holding its two terms.
  const argument = content.locator(':scope > .term[data-hitbox-role="occurrence"]');
  await expect(argument).toHaveCount(1);
  await expect(argument.locator('.add-operand')).toHaveCount(2);
  // The product 2·sin(a+b) is two factors (each in its row chunk, D14).
  await expect(math.view.locator(':scope .multiply-expression > .row-chunk > .factor-slot')).toHaveCount(2);
});

test('\\sin x is refused with "write the brackets"', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Functions');
  await page.locator('#expressionInput').fill('\\sin x');
  await page.locator('#expressionForm button[type="submit"]').click();
  await expect(page.getByText(/Write the brackets: \\sin\(…\)/)).toBeVisible();
});

test('tapping sin in 2\sin(x+y) previews the sine-of-a-sum identity; Confirm commits it, and tapping + collapses it back', async ({ page }) => {
  const math = await setup(page, String.raw`2\sin(x+y)`);
  await math.view.locator('.apply-name').click();
  const actions = page.getByTestId('identity-rule-preview');
  await expect(actions).toContainText('sin(a + b) = sin(a)·cos(b) + cos(a)·sin(b)');
  await expect(math.view.locator('.math-feedback--proposed-insertion').first()).toBeVisible();
  await actions.getByRole('button', { name: 'Confirm' }).click();
  await expect(actions).toHaveCount(0);
  await expect(math.view.locator('.apply-name')).toHaveText(['sin', 'cos', 'cos', 'sin']);
  expect(await math.historyCount()).toBe(2);
  // The + of the expanded sum collapses it back.
  await math.view.locator('.plus').first().click();
  await expect(actions).toBeVisible();
  await actions.getByRole('button', { name: 'Confirm' }).click();
  await expect(math.view.locator('.apply-name')).toHaveText(['sin']);
});

test('Escape cancels an identity preview and leaves the expression unchanged', async ({ page }) => {
  const math = await setup(page, String.raw`\cos(a+b)`);
  await math.view.locator('.apply-name').click();
  await expect(page.getByTestId('identity-rule-preview')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('identity-rule-preview')).toHaveCount(0);
  await expect(math.view.locator('.apply-name')).toHaveText(['cos']);
  expect(await math.historyCount()).toBe(1);
});
