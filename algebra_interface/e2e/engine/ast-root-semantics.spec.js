import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';

/**
 * The inspector reads the actual production AST. This catches regressions in
 * which an invisible one-child Add reappears, even if the printed mathematics
 * still looks correct. No debug-only parser or test-only AST is used.
 */
test('natural expression roots appear in the renderer inspector', async ({ page }) => {
  await page.goto('/?rendererInspector=1');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const picker = page.getByRole('combobox', { name: 'Mathematical occurrence' });
  for (const [source, rootType] of [
    ['((3))', 'Group'], ['a(b+c)', 'Multiply'],
    ['-(a+b)', 'Negate'], ['a+b+c', 'Add'], ['a=b', 'Equal']
  ]) {
    await workspace.activeWindow().build(source);
    await expect.poll(async () => picker.locator('option').first().textContent()).toMatch(new RegExp(`^${rootType} \\(node-`));
    await expect(workspace.activeWindow().view.locator('[data-node-id]').first()).toBeVisible();
  }
});
