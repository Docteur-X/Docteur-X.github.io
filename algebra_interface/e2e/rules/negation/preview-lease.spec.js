/**
 * Phase 4C: verify the first LIVE modal-lease consumer through browser input.
 * The ownership registry itself is deliberately not exposed to the DOM: tests
 * observe its essential externally visible guarantees instead.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';

test('4C: repeated activation cannot replace an active negation proposal', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('4C negation lease');
  const math = workspace.activeWindow();
  await math.build('-(a+b)');
  const before = await math.astText();
  const count = await math.historyCount();
  const operator = math.view.locator('.negate-operator-hitbox');
  await operator.click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  // Synthetic activation exercises the delegated listener even if the preview
  // currently overlays the original operator's physical hitbox.
  if (await operator.count()) await operator.first().dispatchEvent('click');
  await expect(page.getByTestId('negation-preview')).toHaveCount(1);
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(count);
  await page.getByTestId('cancel-negation').click();
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
  await math.view.locator('.negate-operator-hitbox').click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  await page.getByTestId('confirm-negation').click();
  await expect.poll(() => math.historyCount()).toBe(count + 1);
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
});

test('4C: rerender closes the negation preview and permits a fresh lease', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('4C rerender lease');
  const math = workspace.activeWindow();
  await math.build('-(a+b)');
  const count = await math.historyCount();
  await math.view.locator('.negate-operator-hitbox').click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  // Display mode triggers a full equation rerender, not a mathematical commit.
  await page.getByRole('combobox', { name: 'Multiplication display' }).selectOption({ label: 'Centred dot (a · b)' });
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
  expect(await math.historyCount()).toBe(count);
  await math.view.locator('.negate-operator-hitbox').click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  await page.getByTestId('cancel-negation').click();
  expect(await math.historyCount()).toBe(count);
});

test('4C hardening: switching Mathematical Objects cancels negation and allows reacquisition', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('4C object switch lease');
  const math = workspace.activeWindow();
  await math.build('-(a+b)');
  const before = await math.astText();
  const history = await math.historyCount();
  await math.view.locator('.negate-operator-hitbox').click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();

  // A new object switches the single mounted view away from the source AST.
  // This must dispose of the preview without publishing its candidate.
  page.once('dialog', dialog => dialog.accept('Object 2'));
  await page.getByRole('button', { name: 'New object' }).click();
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
  await page.getByRole('button', { name: 'Object 1' }).click();
  await expect.poll(() => math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);

  // The old view lease must not prevent the original object's fresh preview.
  await math.view.locator('.negate-operator-hitbox').click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  await page.getByTestId('cancel-negation').click();
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
});
