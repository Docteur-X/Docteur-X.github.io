/**
 * Phase 3D-4 hardening: exercise the real input listeners and commit lifecycle,
 * not merely the pure negation intent adapter. A command is not a drag session;
 * activation is advisory until the student confirms its detached candidate.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';

for (const key of ['Enter', 'Space']) {
  test(`keyboard ${key} opens one negation preview and confirmation publishes once`, async ({ page }) => {
    await page.goto('/');
    const workspace = new WorkspacePage(page);
    await workspace.createDocument('Negation keyboard hardening');
    const math = workspace.activeWindow();
    await math.build('-(a+b)');
    const before = await math.astText();
    const count = await math.historyCount();
    const operator = math.view.locator('.negate-operator-hitbox');
    await operator.focus();
    await page.keyboard.press(key);
    await expect(page.getByTestId('negation-preview')).toBeVisible();
    expect(await math.astText()).toBe(before);
    expect(await math.historyCount()).toBe(count);
    await page.getByTestId('confirm-negation').click();
    await expect.poll(() => math.historyCount()).toBe(count + 1);
    await expect(page.getByTestId('negation-preview')).toHaveCount(0);
    expect(await math.historyCount()).toBe(count + 1);
  });
}

test('cancelled operator preview never publishes and a subsequent activation remains usable', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Negation cancellation hardening');
  const math = workspace.activeWindow();
  await math.build('-(a+b)');
  const before = await math.astText();
  const count = await math.historyCount();
  await math.view.locator('.negate-operator-hitbox').click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  await page.getByTestId('cancel-negation').click();
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(count);
  await math.view.locator('.negate-operator-hitbox').click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  await page.getByTestId('confirm-negation').click();
  await expect.poll(() => math.historyCount()).toBe(count + 1);
});

test('active equality preview cannot be replaced by a competing negation command', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Modal preview exclusion');
  const math = workspace.activeWindow();
  await math.build('c');
  await page.locator('#copyMathButton').click();
  await math.build('-a=b');
  const count = await math.historyCount();
  const sign = math.view.locator('.relation-sign');
  await sign.click();
  await page.locator('[data-equality-context="add-right"]').click();
  await sign.click();
  await page.getByRole('button', { name: 'Use selected clipboard expression' }).click();
  await expect(math.view.locator('.equality-preview-math')).toBeVisible();
  // Dispatch to an operator if present in the preview, without relying on
  // physical hitbox layering (which belongs to the presentation controller).
  const operator = math.view.locator('.negate-operator-hitbox').first();
  if (await operator.count()) await operator.dispatchEvent('click');
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
  await expect(math.view.locator('.equality-preview-math')).toBeVisible();
  expect(await math.historyCount()).toBe(count);
  await page.getByTestId('cancel-equality').click();
  expect(await math.historyCount()).toBe(count);
});
