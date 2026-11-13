import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';
import { multiSelect } from '../support/mathAssertions.js';

/**
 * Characterization of the existing split Escape dispatch. A negation preview
 * has a document keydown listener, while app.js clears non-modal selection in
 * a window keydown listener. One Escape must not silently perform both actions.
 *
 * This test intentionally records the desired user-facing contract; if it
 * fails, investigate input dispatch before modifying the preview host or AST.
 */
test('one Escape dismisses negation preview without also clearing retained selection', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Escape single-action boundary');
  const math = workspace.activeWindow();
  await math.build('a+b+-(c+d)');
  const before = await math.astText();
  const history = await math.historyCount();

  // Choose two independent top-level addends. Nested operand hitboxes can
  // have different pointer semantics; this test isolates Escape dispatch.
  const operands = math.view.getByRole('button', { name: /^Addend: (a|b)\. Arrows reorder; click selects\.$/ });
  await multiSelect(page, [operands.nth(0), operands.nth(1)]);
  const selected = math.view.locator('.is-multi-selected');
  await expect(selected).toHaveCount(2);

  // Keyboard activation avoids the ordinary unmodified pointerdown policy,
  // which intentionally clears non-modal selection before a new click.
  const negationControl = math.minusSign();
  await negationControl.focus();
  await negationControl.press('Enter');
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  // The preview replaces the committed equation DOM with an inert candidate.
  // Selection classes are therefore absent temporarily; they are NOT a
  // reliable proxy for the retained selection model during preview.
  await expect(selected).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
  // Clearing the candidate restores the original DOM, then the original
  // selection paint should remain: this Escape must not also clear it.
  await expect(selected).toHaveCount(2);
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);

  await page.keyboard.press('Escape');
  await expect(selected).toHaveCount(0);
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
});
