import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';
import { IdentityToolbar } from '../../pages/IdentityToolbar.js';

/**
 * Identity differs from grouping: its candidate overlay is absolutely positioned
 * inside the equation panel, so it must follow panel layout without measuring
 * viewport coordinates. Revealing confirmation actions must not displace the
 * original mathematical hitboxes relative to the equation.
 */
test('identity preview actions preserve source hitbox layout and cancel cleanly', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a+b');
  const originalMath = await math.astText();
  const originalHistory = await math.historyCount();
  const source = math.operand(0);
  const identity = new IdentityToolbar(page);
  const targetBox = await identity.start('Add', source);
  await identity.hover(targetBox, 'right');
  await identity.drop();
  await expect(page.getByRole('button', { name: 'Confirm identity' })).toBeVisible();
  await expect(page.locator('.identity-preview-overlay')).toBeVisible();
  await expect(page.locator('.identity-preview-source-hidden')).toBeVisible();

  // The candidate is a presentation overlay, not a replacement AST or commit.
  expect(await math.astText()).toBe(originalMath);
  expect(await math.historyCount()).toBe(originalHistory);
  // CSS inset:0 fills the panel's padding box, not its outer border box.
  // Compare against that containing block, including the panel border, rather
  // than assuming the overlay and panel have identical border-box rectangles.
  const geometry = await page.evaluate(() => {
    const equation = document.querySelector('#equation');
    const source = equation?.querySelector('.add-operand');
    const overlay = document.querySelector('.identity-preview-overlay');
    const panel = overlay?.parentElement;
    if (!equation || !source || !overlay || !panel) return null;
    const eq = equation.getBoundingClientRect();
    const hit = source.getBoundingClientRect();
    const outer = panel.getBoundingClientRect();
    const visual = overlay.getBoundingClientRect();
    const style = getComputedStyle(overlay);
    const panelStyle = getComputedStyle(panel);
    const expected = {
      left: outer.left + panel.clientLeft,
      top: outer.top + panel.clientTop,
      right: outer.left + panel.clientLeft + panel.clientWidth,
      bottom: outer.top + panel.clientTop + panel.clientHeight,
    };
    const epsilon = 1.5; // fractional CSS pixel rounding, not a layout allowance
    return {
      sourceWithinEquation: hit.left >= eq.left - epsilon && hit.right <= eq.right + epsilon,
      overlayTracksPanel: panelStyle.position === 'relative' &&
        style.position === 'absolute' &&
        ['top', 'right', 'bottom', 'left'].every(side =>
          Math.abs(parseFloat(style[side])) <= epsilon) &&
        ['left', 'top', 'right', 'bottom'].every(side =>
          Math.abs(visual[side] - expected[side]) <= epsilon),
    };
  });
  expect(geometry).not.toBeNull();
  expect(geometry.sourceWithinEquation).toBe(true);
  expect(geometry.overlayTracksPanel).toBe(true);

  await identity.cancel();
  await expect(page.locator('.identity-preview-overlay')).toHaveCount(0);
  expect(await math.astText()).toBe(originalMath);
  expect(await math.historyCount()).toBe(originalHistory);
});
