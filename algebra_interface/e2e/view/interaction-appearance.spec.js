/**
 * Interaction review: appearance contracts the student relies on.
 *
 * Amber dashed means "newly introduced by this proposal" across preview
 * families, so identity insertion must match it in both themes and both
 * hitbox-visibility modes. Only paint is asserted, never mathematics.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';
import { IdentityToolbar } from '../pages/IdentityToolbar.js';

async function start(page, expression) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Appearance');
  const math = workspace.activeWindow();
  await math.build(expression);
  return math;
}

for (const theme of ['light', 'dark']) {
  for (const visibility of ['visible', 'hover']) {
    test(`identity preview is dashed amber in ${theme} / ${visibility} hitboxes`, async ({ page }) => {
      const math = await start(page, 'a+b');
      if (theme === 'dark') await page.locator('#themeToggle').click();
      await page.locator('#hitboxVisibilityMode').selectOption(visibility);
      const identity = new IdentityToolbar(page);
      const box = await identity.start('Add', math.operand(0));
      await identity.hover(box, 'right');
      await identity.drop();
      const added = page.locator('.identity-preview-new');
      await expect(added).toBeVisible();
      const paint = await added.evaluate(element => {
        const style = getComputedStyle(element);
        // The shared amber token, resolved through the current theme.
        const probe = document.createElement('span');
        probe.style.color = 'var(--proposal-ink)';
        document.body.append(probe);
        const ink = getComputedStyle(probe).color;
        probe.remove();
        return { outlineStyle: style.outlineStyle, outlineColor: style.outlineColor, ink };
      });
      expect(paint.outlineStyle).toBe('dashed');
      expect(paint.outlineColor).toBe(paint.ink);
    });
  }
}

test('the negation minus has a comfortable width', async ({ page }) => {
  const math = await start(page, 'a-b');
  const box = await math.minusSign().boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(16);
});

test('the negation minus outline follows the hitbox setting', async ({ page }) => {
  const math = await start(page, 'a-b');
  const minus = math.minusSign();
  const colour = () => minus.evaluate(element => getComputedStyle(element).outlineColor);
  await page.locator('#selectionLabel').hover();
  const visible = await colour();
  expect(visible).not.toBe('rgba(0, 0, 0, 0)');
  await page.locator('#hitboxVisibilityMode').selectOption('hover');
  await page.locator('#selectionLabel').hover();
  expect(await colour()).toBe('rgba(0, 0, 0, 0)');
  await minus.hover();
  expect(await colour()).not.toBe('rgba(0, 0, 0, 0)');
});

test('a signed factor shows a dot, and its text rebuilds to the same mathematics', async ({ page }) => {
  const math = await start(page, 'a(b-c)');
  await math.view.locator('.factor-slot').first().focus();
  await page.keyboard.press('d');
  await math.view.locator('.distribution-preview__copy').first().click();
  await expect(math.view.locator('.multiply-operator--dot')).toHaveCount(1);
  await expect(math.view.locator('.multiply-operator--dot')).toHaveText('·');
  const committed = await math.astText();
  await expect(page.locator('#expressionInput')).toHaveValue('a b+a·-c');
  await page.locator('#expressionForm button[type="submit"]').click();
  await expect.poll(() => math.astText()).toBe(committed);
});

for (const visibility of ['visible', 'hover']) {
  test(`hovering a proposed -1 keeps its amber look with ${visibility} hitboxes`, async ({ page }) => {
    const math = await start(page, '-b');
    await page.locator('#themeToggle').click();
    await page.locator('#hitboxVisibilityMode').selectOption(visibility);
    await math.view.locator('.negate-operator-hitbox').click();
    const added = math.view.locator('.math-feedback--proposed-insertion');
    await expect(added).toBeVisible();
    const paint = () => added.evaluate(element => {
      const style = getComputedStyle(element);
      return [style.backgroundColor, style.borderTopColor, style.outlineStyle, style.outlineColor].join('|');
    });
    await page.locator('#selectionLabel').hover();
    await expect.poll(paint).toContain('dashed');
    await page.waitForFunction(() => document.querySelector('.math-feedback--proposed-insertion').getAnimations().length === 0);
    const resting = await paint();
    // Present, not merely declared: a transparent outline would look like no feedback.
    expect(resting).not.toContain('rgba(0, 0, 0, 0)');
    await added.hover();
    await page.waitForFunction(() => document.querySelector('.math-feedback--proposed-insertion').getAnimations().length === 0);
    const hovered = await added.evaluate(element => {
      const style = getComputedStyle(element);
      return { outline: style.outlineStyle, border: style.borderTopStyle, colour: style.outlineColor };
    });
    // The equality preview's look, for every candidate preview (owner, 12
    // November 2026): hover keeps the solid gold border and the dashed inner
    // accent, and strengthens the glow.
    expect(hovered).toEqual({ outline: 'dashed', border: 'solid', colour: resting.split('|')[3] });
  });
}

test('hovering a proposed +0 answers like a distribution copy, and cancel removes the role', async ({ page }) => {
  const math = await start(page, 'a+b');
  const identity = new IdentityToolbar(page);
  const box = await identity.start('Add', math.operand(0));
  await identity.hover(box, 'right');
  await identity.drop();
  const added = page.locator('.identity-preview-new');
  await expect(added).toHaveClass(/math-feedback--proposed-insertion/);
  await added.hover();
  await page.waitForFunction(() => document.querySelector('.identity-preview-new').getAnimations().length === 0);
  const hovered = await added.evaluate(element => {
    const style = getComputedStyle(element);
    return { outline: style.outlineStyle, border: style.borderTopStyle };
  });
  expect(hovered).toEqual({ outline: 'solid', border: 'dashed' });
  await identity.cancel();
  await expect(page.locator('.math-feedback--proposed-insertion')).toHaveCount(0);
});

for (const visibility of ['visible', 'hover']) {
  test(`dragging +0 over a product shows one amber target with ${visibility} hitboxes`, async ({ page }) => {
    const math = await start(page, 'a b+a c');
    await page.locator('#hitboxVisibilityMode').selectOption(visibility);
    const identity = new IdentityToolbar(page);
    const box = await identity.start('Add', math.operand(0));
    // Aim at the product's own padding, not at one of its inner factors.
    await page.mouse.move(box.x + 3, box.y + box.height / 2, { steps: 8 });
    const target = math.view.locator('.math-feedback--proposed-target');
    await expect(target).toHaveClass(/add-operand--product/);
    await expect(target).toHaveCount(1);
    await page.waitForFunction(() => document.querySelector('.math-feedback--proposed-target').getAnimations().length === 0);
    const paint = await target.evaluate(element => {
      const style = getComputedStyle(element);
      const probe = document.createElement('span');
      probe.style.color = 'var(--proposal-ink)';
      document.body.append(probe);
      const ink = getComputedStyle(probe).color;
      probe.remove();
      return { border: style.borderTopColor, ink };
    });
    expect(paint.border).toBe(paint.ink);
    await page.keyboard.press('Escape');
    await expect(target).toHaveCount(0);
    await page.mouse.up();
  });
}
