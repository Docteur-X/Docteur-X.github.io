/**
 * Retrospective Phases 1-4: real-browser boundary checks.
 * These deliberately exercise production handlers, not fabricated lease owners.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';

test('negation cleanup restores the view and releases its lease when listener unbinding throws', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Retrospective cleanup fault injection');
  const math = workspace.activeWindow();
  await math.build('-(a+b)');
  const initialAst = await math.astText();
  const initialHistory = await math.historyCount();
  await math.view.locator('.negate-operator-hitbox').click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();

  // Throw once while the feature-owned confirmation binding is being removed.
  // The preview controller must still restore the original equation DOM, and
  // the app-level finally must release the view-local lease. We intentionally
  // do not require a clean console: this is an injected failure.
  await page.evaluate(() => {
    const original = Element.prototype.removeEventListener;
    let injected = false;
    Element.prototype.removeEventListener = function(type, listener, options) {
      if (!injected && this.classList?.contains('negation-preview-math') && type === 'click') {
        injected = true;
        Element.prototype.removeEventListener = original;
        throw new Error('retrospective injected unbind failure');
      }
      return original.call(this, type, listener, options);
    };
  });
  await page.getByTestId('cancel-negation').click();
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
  await expect(math.view.locator('.negate-operator-hitbox')).toBeVisible();
  expect(await math.astText()).toBe(initialAst);
  expect(await math.historyCount()).toBe(initialHistory);

  await math.view.locator('.negate-operator-hitbox').click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  await page.getByTestId('cancel-negation').click();
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
});

test('active equality proposal excludes a real negation activation and survives until cancelled', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Retrospective modal conflict');
  const math = workspace.activeWindow();
  await math.build('c');
  await page.locator('#copyMathButton').click();
  await math.build('-a=b');
  const initialAst = await math.astText();
  const initialHistory = await math.historyCount();
  const sign = math.view.locator('.relation-sign');
  await sign.click();
  await page.locator('[data-equality-context="add-right"]').click();
  await sign.click();
  await page.getByRole('button', { name: 'Use selected clipboard expression' }).click();
  await expect(math.view.locator('.equality-preview-math')).toBeVisible();
  const operator = math.view.locator('.negate-operator-hitbox').first();
  if (await operator.count()) await operator.dispatchEvent('click');
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
  await expect(math.view.locator('.equality-preview-math')).toBeVisible();
  expect(await math.astText()).toBe(initialAst);
  expect(await math.historyCount()).toBe(initialHistory);
  await page.getByTestId('cancel-equality').click();
  await expect(math.view.locator('.equality-preview-math')).toHaveCount(0);
  await math.view.locator('.negate-operator-hitbox').first().click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  await page.getByTestId('cancel-negation').click();
});
