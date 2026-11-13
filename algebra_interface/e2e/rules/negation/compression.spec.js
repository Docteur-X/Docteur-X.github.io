import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';
import { beginPointerDrag, movePointerTo } from '../../support/pointerGestures.js';

/**
 * Negation v1.2: exercise actual pointer targeting, not a synthetic call to
 * the engine. Wait for semantic eligibility before releasing the pointer.
 * The student must be able to distinguish the outer Group from its Number.
 */
test('drag -1 onto grouped sum previews amber minus and commits once', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('-1*(a+b)');
  const before = await math.astText();
  const history = await math.historyCount();
  const source = math.view.locator('.factor-slot').first();
  const group = math.view.locator('.factor-slot').nth(1);
  const bracket = group.locator(':scope > .group-content > .expression-bracket').first();
  const { targetBox } = await beginPointerDrag(page, source, bracket);
  await movePointerTo(page, targetBox);
  await expect(group).toHaveClass(/math-feedback--eligible/);
  await expect(group).toHaveAttribute('data-math-feedback-hint', 'Release to negate');
  const green = await group.evaluate(element => ({
    outline: getComputedStyle(element).outlineStyle,
    shadow: getComputedStyle(element).boxShadow,
    hint: getComputedStyle(element, '::after').content
  }));
  expect(green.outline).toBe('solid');
  expect(green.shadow).not.toBe('none');
  expect(green.hint).toContain('Release to negate');
  await page.mouse.up();
  await expect(math.view.locator('[data-math-feedback-hint]')).toHaveCount(0);
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  await expect(page.getByTestId('negation-preview')).toContainText('Preview: −1 becomes −');
  const amber = math.view.locator('.negate-operator-hitbox.math-feedback--proposed-insertion');
  await expect(amber).toHaveCount(1);
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
  await amber.click();
  await expect.poll(() => math.historyCount()).toBe(history + 1);
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
});

test('cancel compression leaves source and history untouched', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('-1*(b)');
  const before = await math.astText();
  const history = await math.historyCount();
  const source = math.view.locator('.factor-slot').first();
  const target = math.view.locator('.factor-slot').nth(1)
    .locator(':scope > .group-content > .expression-bracket').first();
  const { targetBox } = await beginPointerDrag(page, source, target);
  await movePointerTo(page, targetBox);
  await expect(math.view.locator('.factor-slot').nth(1)).toHaveClass(/math-feedback--eligible/);
  await expect(math.view.locator('.factor-slot').nth(1)).toHaveAttribute('data-math-feedback-hint', 'Release to negate');
  await page.mouse.up();
  await expect(math.view.locator('[data-math-feedback-hint]')).toHaveCount(0);
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  await page.getByTestId('cancel-negation').click();
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
});
