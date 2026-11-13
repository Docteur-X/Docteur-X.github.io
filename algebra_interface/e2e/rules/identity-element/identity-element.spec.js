import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';
import { expectMathJSON } from '../../support/mathAssertions.js';
import { IdentityToolbar } from '../../pages/IdentityToolbar.js';

// These tests exercise the complete pointer -> hover -> preview -> commit path.
test('drag +0: stationary hover, deliberate preview, then committed history', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const window = workspace.activeWindow();
  await window.build('a+b');
  const before = await window.astText();
  const historyBefore = await window.historyCount();
  const target = window.operand(0);
  const identity = new IdentityToolbar(page);
  const targetBox = await identity.start('Add', target);
  const beforeHover = await target.boundingBox();
  await identity.hover(targetBox, 'right');
  await expect(window.view.locator('.math-feedback--proposed-target')).toBeVisible();
  expect(await window.astText()).toBe(before);
  const afterHover = await target.boundingBox();
  expect(Math.abs(afterHover.x - beforeHover.x)).toBeLessThan(2);
  expect(Math.abs(afterHover.y - beforeHover.y)).toBeLessThan(2);
  await identity.drop();
  await expect(page.getByRole('button', { name: 'Confirm identity' })).toBeVisible();
  expect(await window.astText()).toBe(before);
  await identity.confirm();
  await expect(page.getByRole('button', { name: 'Confirm identity' })).toBeHidden();
  await expect.poll(() => window.historyCount()).toBe(historyBefore + 1);
  await expectMathJSON(window, ['Add', 'a', 0, 'b']);
  expect(errors).toEqual([]);
});

test('cancel identity preview leaves mathematical history unchanged', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const window = workspace.activeWindow();
  await window.build('a+b');
  const before = await window.astText();
  const historyBefore = await window.historyCount();
  const identity = new IdentityToolbar(page);
  const targetBox = await identity.start('Multiply', window.operand(0));
  await identity.hover(targetBox, 'right');
  await identity.drop();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
  await identity.cancel();
  await expect(page.getByRole('button', { name: 'Confirm identity' })).toBeHidden();
  expect(await window.astText()).toBe(before);
  expect(await window.historyCount()).toBe(historyBefore);
});
