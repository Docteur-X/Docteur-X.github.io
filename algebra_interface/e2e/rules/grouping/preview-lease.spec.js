/**
 * Phase 4D-3: a grouping preview is a modal mathematical proposal, whereas
 * selecting adjacent operands is not. Changing the bracket style must close
 * the old proposal and reacquire ownership for the replacement without a
 * history publication or loss of the student's operand selection.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';
import { multiSelect, expectOneCommit } from '../../support/mathAssertions.js';

test('4D-3: grouping style replacement and cancellation preserve single-use confirmation', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('4D grouping ownership');
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  const original = await math.astText();
  const before = await math.historyCount();
  await multiSelect(page, [math.operand(0), math.operand(1)]);
  const open = page.getByRole('button', { name: 'Preview grouping of selected adjacent operands' }).first();
  const confirm = page.getByRole('button', { name: 'Confirm grouping', exact: true });
  await open.click();
  await expect(confirm).toBeVisible();
  await page.locator('#groupStyle').selectOption({ label: '[ ]' });
  await expect(confirm).toBeVisible();
  expect(await math.astText()).toBe(original);
  expect(await math.historyCount()).toBe(before);
  await page.keyboard.press('Escape');
  await expect(confirm).toBeHidden();
  expect(await math.historyCount()).toBe(before);
  // One Escape cancels only the preview; selection remains usable.
  await open.click();
  await expect(confirm).toBeVisible();
  await confirm.click();
  await expectOneCommit(math, original, before);
  expect(await math.historyCount()).toBe(before + 1);
});

test('4D-3 hardening: switching objects closes grouping preview and permits reopening', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('4D grouping switch cleanup');
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  const original = await math.astText();
  const history = await math.historyCount();
  await multiSelect(page, [math.operand(0), math.operand(1)]);
  const open = page.getByRole('button', { name: 'Preview grouping of selected adjacent operands' }).first();
  const confirm = page.getByRole('button', { name: 'Confirm grouping', exact: true });
  await open.click();
  await expect(confirm).toBeVisible();

  // The object switch runs resetRangeSelection(), which must cancel the
  // proposal, dispose of its overlay, and release the view-local lease.
  page.once('dialog', dialog => dialog.accept('Object 2'));
  await page.getByRole('button', { name: 'New object' }).click();
  // Verify navigation happened, not merely that the preview was dismissed.
  // The outside-pointer interceptor previously ate this creation click.
  await expect(page.getByRole('button', { name: 'Object 2', exact: true })).toBeVisible();
  await expect(confirm).toBeHidden();
  await page.getByRole('button', { name: 'Object 1' }).click();
  await expect.poll(() => math.astText()).toBe(original);
  expect(await math.historyCount()).toBe(history);

  // Selection is intentionally reset by object switching. A fresh selection
  // and request must be able to acquire a new modal lease.
  await multiSelect(page, [math.operand(0), math.operand(1)]);
  await expect(math.view.locator('.add-operand.is-multi-selected')).toHaveCount(2);
  await expect(open).toBeVisible();
  await open.click();
  await expect(confirm).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(confirm).toBeHidden();
  expect(await math.historyCount()).toBe(history);
});
