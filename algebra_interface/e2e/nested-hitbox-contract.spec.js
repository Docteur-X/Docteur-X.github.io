import { test, expect } from '@playwright/test';
import { WorkspacePage } from './pages/WorkspacePage.js';

/** Verify real DOM targeting, not just AST IDs or renderer classes. */
test('grouped literal exposes separate outer and inner mathematical hitboxes', async ({ page }) => {
  const workspace = new WorkspacePage(page);
  await page.goto('/');
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('((-3))');
  const nodes = math.view.locator('[data-hitbox-role="occurrence"][data-node-id]');
  await expect(nodes).toHaveCount(3);
  const outer = nodes.nth(0);
  const middle = nodes.nth(1);
  const inner = nodes.nth(2);
  await expect(outer).toBeVisible();
  await expect(middle).toBeVisible();
  await expect(inner).toBeVisible();
  const ids = await nodes.evaluateAll(els => els.map(el => el.dataset.nodeId));
  expect(new Set(ids).size).toBe(3);
  expect(await outer.evaluate((el, id) => el.contains(document.querySelector(`[data-node-id="${id}"]`)), ids[2])).toBe(true);
  // Geometry and the mathematical tree remain unchanged when hover feedback
  // becomes active; this is critical for drag hit-testing on low-end devices.
  const before = await outer.boundingBox();
  await inner.hover();
  const after = await outer.boundingBox();
  expect(after?.width).toBeCloseTo(before.width, 1);
  expect(after?.height).toBeCloseTo(before.height, 1);
});
