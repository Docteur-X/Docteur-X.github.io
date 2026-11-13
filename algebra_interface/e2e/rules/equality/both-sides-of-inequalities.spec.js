/**
 * Stage E4d in the browser: the relation menu on < and >. Multiplying by a
 * number flips < when it is negative; multiplying by an expression of unknown
 * sign asks the student, and the answer is kept on the history step.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';
import { expectMathJSON } from '../../support/mathAssertions.js';

async function setup(page, operand, statement) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Inequality');
  const math = workspace.activeWindow();
  await math.build(operand);
  await page.locator('#copyMathButton').click();
  await expect(page.locator('#clipboardCount')).toHaveText('1');
  await math.build(statement);
  return math;
}
async function multiplyLeft(page, math) {
  const sign = math.view.locator('.relation-sign');
  await expect(sign).toHaveAttribute('aria-label', /^is (less|greater) than: operation menu$/);
  await sign.click();
  await page.locator('[data-equality-context="multiply-left"]').click();
  await sign.click();
  await page.getByRole('button', { name: 'Use selected clipboard expression' }).click();
}

test('multiplying a<b by −2 previews the flipped inequality; confirm commits −2a > −2b', async ({ page }) => {
  const math = await setup(page, '-2', 'a<b');
  await multiplyLeft(page, math);
  await expect(page.getByTestId('relation-sign-question')).toHaveCount(0);
  await expect(math.view.locator('.equality-preview-math')).toBeVisible();
  await page.locator('.equality-preview-math [data-preview-confirm="true"]').first().click();
  await expectMathJSON(math, ['Greater', ['Multiply', -2, 'a'], ['Multiply', -2, 'b']]);
  await expect(page.locator('#statusMessage')).toContainText('The inequality flipped');
});

test('multiplying a<b by c asks for the sign of c; "c < 0" flips it and is kept on the step', async ({ page }) => {
  const math = await setup(page, 'c', 'a<b');
  const before = await math.historyCount();
  await multiplyLeft(page, math);
  const question = page.getByTestId('relation-sign-question');
  await expect(question).toContainText('Is c positive, zero or negative?');
  await expect(question.getByRole('button')).toHaveText(['c > 0: keeps <', 'c = 0: gives =', 'c < 0: flips to >', 'Cancel']);
  await question.getByRole('button', { name: 'c < 0: flips to >' }).click();
  await expect(question).toHaveCount(0);
  await page.locator('.equality-preview-math [data-preview-confirm="true"]').first().click();
  await expectMathJSON(math, ['Greater', ['Multiply', 'c', 'a'], ['Multiply', 'c', 'b']]);
  expect(await math.historyCount()).toBe(before + 1);
  await expect(page.locator('#statusMessage')).toContainText('Assuming c < 0');
});

test('Escape dismisses the sign question and changes nothing', async ({ page }) => {
  const math = await setup(page, 'c', 'a<b');
  const before = await math.historyCount();
  await multiplyLeft(page, math);
  const question = page.getByTestId('relation-sign-question');
  await expect(question).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(question).toHaveCount(0);
  await expectMathJSON(math, ['Less', 'a', 'b']);
  expect(await math.historyCount()).toBe(before);
});
