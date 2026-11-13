import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';

test('clicking a structural minus previews -1 without changing history until confirmed', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a+-(b c)');
  const before = await math.astText();
  const count = await math.historyCount();
  await math.minusSign().click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  await expect(page.getByTestId('negation-preview')).toContainText('Preview: − becomes −1');
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(count);
  await page.getByTestId('cancel-negation').click();
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
  expect(await math.historyCount()).toBe(count);
  await math.minusSign().click();
  await page.getByTestId('confirm-negation').click();
  await expect.poll(() => math.historyCount()).toBe(count + 1);
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
  await expect(math.view.locator('.negate-operator-hitbox')).toHaveCount(0);
});

/**
 * Negation v1.1: the mathematical candidate replaces the visible expression
 * temporarily. Only the newly introduced -1 is amber; the original operand
 * is never highlighted and history stays untouched until confirmation.
 */
test('negation preview stays in the original view and highlights only the new -1', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a+-(b+c)');
  const before = await math.astText();
  const history = await math.historyCount();
  await math.minusSign().click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  await expect(math.view.locator('.expression-root')).toHaveCount(1);
  await expect(math.view.locator('.math-feedback--proposed-insertion')).toHaveCount(1);
  await expect(math.view.locator('.math-feedback--proposed-insertion')).toContainText('−1');
  await expect(math.view.locator('.negation-inline-preview')).toHaveCount(0);
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
  await page.getByTestId('cancel-negation').click();
  await expect(math.view.locator('.math-feedback--proposed-insertion')).toHaveCount(0);
  await expect(math.view.locator('.negate-operator-hitbox')).toHaveCount(1);
  expect(await math.historyCount()).toBe(history);
});

/**
 * Negation v1.1.1: a semantic amber occurrence is a reusable confirmation
 * gesture. Verify computed styling, not merely the class name: the hover-only
 * visibility preference previously suppressed the glow through CSS specificity.
 */
for (const theme of ['light', 'dark']) {
  for (const visibility of ['Always visible', 'On hover / selection']) {
    test(`amber -1 is visible and clickable in ${theme} / ${visibility}`, async ({ page }) => {
      await page.goto('/');
      const workspace = new WorkspacePage(page);
      await workspace.createDocument();
      const math = workspace.activeWindow();
      await math.build('3+-(a+b)');
      // Theme is a user preference, not mathematical state.
      const themeButton = page.getByRole('button', { name: /Switch to (dark|light) mode/ });
      const htmlTheme = await page.locator('html').getAttribute('data-theme');
      if (htmlTheme !== theme) await themeButton.click();
      await page.getByRole('combobox', { name: 'Hitbox outline visibility' }).selectOption({ label: visibility });
      const history = await math.historyCount();
      await math.minusSign().click();
      const amber = math.view.locator('.math-feedback--proposed-insertion');
      await expect(amber).toHaveCount(1);
      await expect(amber).toHaveAttribute('data-preview-confirm', 'true');
      // Measure the resting look: the click left the pointer over this term, and
      // hover has its own look, tested in interaction-appearance.spec.js.
      await page.locator('#selectionLabel').hover();
      await page.waitForFunction(() => document.querySelector('.math-feedback--proposed-insertion').getAnimations().length === 0);
      const appearance = await amber.evaluate(el => {
        const css = getComputedStyle(el);
        return { outlineStyle: css.outlineStyle, outlineColor: css.outlineColor,
          boxShadow: css.boxShadow, pointerEvents: css.pointerEvents };
      });
      expect(appearance.outlineStyle).toBe('dashed');
      expect(appearance.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(appearance.boxShadow).not.toBe('none');
      expect(appearance.pointerEvents).toBe('auto');
      expect(await math.historyCount()).toBe(history);
      await amber.click();
      await expect.poll(() => math.historyCount()).toBe(history + 1);
      await expect(page.getByTestId('negation-preview')).toHaveCount(0);
      await expect(amber).toHaveCount(0);
    });
  }
}

test('amber preview confirmation supports keyboard activation and remains single-use', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a+-(b+c)');
  const before = await math.historyCount();
  await math.minusSign().click();
  const amber = math.view.locator('[data-preview-confirm="true"]');
  await amber.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => math.historyCount()).toBe(before + 1);
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
});
