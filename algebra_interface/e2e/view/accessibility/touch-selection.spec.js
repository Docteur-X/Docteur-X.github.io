import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';

test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

test('repeated touch taps enter multi-selection, toggle nodes, and clear the final selection', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  const before = await math.astText();
  const count = await math.historyCount();
  const first = math.operand(0);
  const second = math.operand(1);
  await first.tap();
  await expect(page.locator('#multiSelectButton')).toHaveAttribute('aria-pressed', 'false');
  await first.tap();
  await expect(page.locator('#multiSelectButton')).toHaveAttribute('aria-pressed', 'true');
  await expect(first).toHaveClass(/is-multi-selected/);
  await second.tap();
  await expect(second).toHaveClass(/is-multi-selected/);
  await first.tap();
  await expect(first).not.toHaveClass(/is-multi-selected/);
  await expect(second).toHaveClass(/is-multi-selected/);
  await second.tap();
  await expect(page.locator('#multiSelectButton')).toHaveAttribute('aria-pressed', 'false');
  await expect(math.view.locator('.is-multi-selected')).toHaveCount(0);
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(count);
});

test('toolbar selection toggles by touch and empty space clears without a history commit', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  const count = await math.historyCount();
  const button = page.locator('#multiSelectButton');
  await button.tap();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await math.operand(0).tap();
  await math.operand(1).tap();
  await expect(math.view.locator('.is-multi-selected')).toHaveCount(2);
  // Toolbar interactions preserve selection; only blank workspace clears it.
  await page.locator('#selectionLabel').tap();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(math.view.locator('.is-multi-selected')).toHaveCount(2);
  await page.locator('.equation-panel').tap({ position: { x: 12, y: 12 } });
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(math.view.locator('.is-multi-selected')).toHaveCount(0);
  expect(await math.historyCount()).toBe(count);
});
