/**
 * Phase 2 renderer-to-resolver contract: verify metadata emitted by the real
 * browser renderer, rather than constructing synthetic DOM fixtures alone.
 * The resolver indexes these attributes; operator indices follow operand
 * boundaries (1 for the first binary operator), not zero-based glyph order.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';

test('real renderer exposes stable, correctly indexed plus operators', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  const plus = math.view.locator('.plus[data-operator-owner-id][data-operator-index]');
  await expect(plus).toHaveCount(2);
  await expect(plus.nth(0)).toHaveAttribute('data-operator-index', '1');
  await expect(plus.nth(1)).toHaveAttribute('data-operator-index', '2');
  const ownerIds = await plus.evaluateAll(elements => elements.map(el => el.dataset.operatorOwnerId));
  expect(ownerIds[0]).toBe(ownerIds[1]);
  await expect(math.view.locator(`[data-parent-id="${ownerIds[0]}"][data-hitbox-role="content"]`)).toHaveCount(1);
});

test('nested and relation renderer targets retain semantic roles', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a=(b+c)');
  await expect(math.view.locator('.relation-sign[data-hitbox-role="operator"][data-operator-owner-id]')).toHaveCount(1);
  await expect(math.view.locator('.relation-root[data-hitbox-role="content"][data-parent-id]')).toHaveCount(1);
  await expect(math.view.locator('.add-content[data-hitbox-role="content"][data-parent-id]')).toHaveCount(1);
});
