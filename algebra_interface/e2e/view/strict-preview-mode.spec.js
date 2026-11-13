/**
 * Owner decision 1.2 (strict): while a preview is open, only confirm, cancel
 * and the preview's own controls do anything. Every other key, drag and
 * toolbar action must leave the mathematics and history unchanged.
 *
 * An outside click may CANCEL the preview (that is the agreed way to cancel);
 * it must never also perform the clicked action.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';
import { multiSelect } from '../support/mathAssertions.js';

async function start(page, expression) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Strict preview mode');
  const math = workspace.activeWindow();
  await math.build(expression);
  return math;
}

// Each family: an expression, how to open its preview, and what shows it is open.
const FAMILIES = [
  { name: 'negation', expression: '-(a+b)',
    open: async (page, math) => { await math.view.locator('.negate-operator-hitbox').click(); },
    shown: page => page.getByTestId('negation-preview') },
  { name: 'grouping', expression: 'a+b+c',
    open: async (page, math) => {
      await multiSelect(page, [math.operand(0), math.operand(1)]);
      await page.getByRole('button', { name: 'Preview grouping of selected adjacent operands' }).first().click();
    },
    shown: page => page.getByRole('button', { name: 'Confirm grouping', exact: true }) },
  { name: 'factorisation', expression: '(a*b+a*c)',
    open: async (page, math) => {
      const factors = math.view.locator('.factor-slot');
      await multiSelect(page, [factors.nth(0), factors.nth(2)]);
      await page.locator('#previewFactorisationButton').click();
    },
    shown: page => page.getByRole('button', { name: 'Confirm extraction' }) },
  { name: 'distribution', expression: '2(x+3)',
    open: async (page, math) => {
      await math.view.locator('.factor-slot').first().focus();
      await page.keyboard.press('d');
    },
    shown: (page, math) => math.view.locator('[data-preview-confirm]').first() }
];

for (const family of FAMILIES) {
  test(`${family.name} preview: keys on the mathematics do nothing`, async ({ page }) => {
    const math = await start(page, family.expression);
    const before = await math.astText();
    const history = await math.historyCount();
    await family.open(page, math);
    await expect(family.shown(page, math)).toBeVisible();
    // Try every keyboard command an occurrence understands, on the first
    // focusable part of the equation that is NOT the preview's own confirm
    // target (pressing Enter there confirms, which is allowed).
    await math.view.locator('[data-node-id][tabindex="0"]:not(.transformation-preview__confirm):not(.math-feedback--proposed-insertion):not([data-preview-confirm])')
      .first().focus().catch(() => {});
    for (const key of ['ArrowRight', 'ArrowLeft', 'd', 'Control+Enter']) await page.keyboard.press(key);
    await expect(family.shown(page, math)).toBeVisible();
    expect(await math.astText()).toBe(before);
    expect(await math.historyCount()).toBe(history);
  });

  test(`${family.name} preview: a drag on the mathematics does not start`, async ({ page }) => {
    const math = await start(page, family.expression);
    const before = await math.astText();
    const history = await math.historyCount();
    await family.open(page, math);
    await expect(family.shown(page, math)).toBeVisible();
    const box = await math.view.boundingBox();
    // Drag from the left of the equation to the right, as a reorder would.
    await page.mouse.move(box.x + 10, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2, { steps: 8 });
    await expect(page.locator('body.is-dragging')).toHaveCount(0);
    await page.mouse.up();
    expect(await math.astText()).toBe(before);
    expect(await math.historyCount()).toBe(history);
  });

  test(`${family.name} preview: toolbar actions do not act`, async ({ page }) => {
    const math = await start(page, family.expression);
    const before = await math.astText();
    const history = await math.historyCount();
    const clipboardBefore = await page.locator('#clipboardList [data-clipboard-entry], #clipboardList li').count();
    await family.open(page, math);
    await expect(family.shown(page, math)).toBeVisible();
    // Each click may cancel the preview (an outside click), but must not
    // also perform its own action. Reopen the preview before the next one.
    for (const selector of ['#copyMathButton', '#multiSelectButton', '#wrapGroupButton']) {
      if (!(await family.shown(page, math).isVisible())) {
        await page.keyboard.press('Escape');
        await family.open(page, math);
        await expect(family.shown(page, math)).toBeVisible();
      }
      const button = page.locator(selector);
      if (await button.isVisible() && await button.isEnabled()) await button.click();
      expect(await math.astText(), selector).toBe(before);
      expect(await math.historyCount(), selector).toBe(history);
    }
    await expect(page.locator('#multiSelectButton')).toHaveAttribute('aria-pressed', 'false');
    expect(await page.locator('#clipboardList [data-clipboard-entry], #clipboardList li').count()).toBe(clipboardBefore);
  });
}

// Decision 2.2: the router answers "what can I do here?" from the gesture
// declarations, and offers nothing while a preview holds the view.
test('"what can I do here?" lists a part\'s gestures, and nothing during a preview', async ({ page }) => {
  const math = await start(page, '-(a+b)');
  const at = selector => page.evaluate(sel =>
    window.manipulatorDiagnostics.gesturesAt(document.querySelector(sel)).map(g => g.ruleId), selector);
  expect(await at('.negate-operator-hitbox')).toEqual(['negation.expand']);
  // The addend a inside the bracket (the outer box is the whole expression).
  expect(await at('.add-content .add-operand')).toContain('addition.rearrange');
  await math.view.locator('.negate-operator-hitbox').click();
  await expect(page.getByTestId('negation-preview')).toBeVisible();
  expect(await page.evaluate(() => window.manipulatorDiagnostics.mode())).toBe('preview');
  expect(await at('[data-node-id]')).toEqual([]);
});
