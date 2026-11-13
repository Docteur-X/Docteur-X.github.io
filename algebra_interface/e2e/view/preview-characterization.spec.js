/**
 * Phase 4A browser characterization. These tests observe existing preview
 * semantics; they do not assume a centralized modal owner already exists.
 * Preserve these behavioural contracts while designing Phase 4B.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';
import { multiSelect } from '../support/mathAssertions.js';

test('4A: grouping Escape cancels without publication; reselection permits a new preview', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('4A grouping preview');
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  const original = await math.astText();
  const history = await math.historyCount();
  await multiSelect(page, [math.operand(0), math.operand(1)]);
  const open = page.getByRole('button', { name: 'Preview grouping of selected adjacent operands' }).first();
  const confirm = page.getByRole('button', { name: 'Confirm grouping', exact: true });
  await open.click();
  await expect(confirm).toBeVisible();
  // The first Escape cancels the modal preview; the second may clear the
  // underlying selection. Neither action is allowed to publish mathematics.
  await page.keyboard.press('Escape');
  await expect(confirm).toBeHidden();
  expect(await math.astText()).toBe(original);
  expect(await math.historyCount()).toBe(history);
  await page.keyboard.press('Escape');
  await expect(confirm).toBeHidden();
  expect(await math.astText()).toBe(original);
  expect(await math.historyCount()).toBe(history);

  // Re-establish the explicit selection prerequisite instead of assuming
  // repeated Escape preserves selection or leaves the old button mounted.
  await multiSelect(page, [math.operand(0), math.operand(1)]);
  const reopen = page.getByRole('button', { name: 'Preview grouping of selected adjacent operands' }).first();
  await expect(reopen).toBeVisible();
  await reopen.click();
  await expect(confirm).toBeVisible();
  expect(await math.historyCount()).toBe(history);
});

test('4A: negation preview Escape does not publish and operator can reopen it', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('4A negation preview');
  const math = workspace.activeWindow();
  await math.build('-(a+b)');
  const original = await math.astText();
  const history = await math.historyCount();
  await math.view.locator('.negate-operator-hitbox').click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
  expect(await math.astText()).toBe(original);
  expect(await math.historyCount()).toBe(history);
  await math.view.locator('.negate-operator-hitbox').click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
});
