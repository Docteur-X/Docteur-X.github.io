import { test, expect } from '@playwright/test';
import { WorkspacePage } from './pages/WorkspacePage.js';

test('application loads ES modules and builds a mathematical expression', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /new document/i })).toBeVisible();
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const window = workspace.activeWindow();
  await window.build('a+b+c');
  await expect(window.view.locator('.add-operand')).toHaveCount(3);
  await expect(window.root).toHaveAttribute('data-object-id', /.+/);
  expect(errors).toEqual([]);
});
