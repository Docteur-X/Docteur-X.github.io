/**
 * T7 (14 November 2026): distribution's amber copies follow the renderer's
 * notation contract: letters use the font set's letter face (italic in the
 * TeX fonts), exactly as the same letters do in the equation.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';
import { beginPointerDrag, movePointerTo } from '../../support/pointerGestures.js';

test('amber copies draw letters in the same face as the equation', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a*(b+c)');
  const { targetBox } = await beginPointerDrag(page,
    math.view.locator('.factor-slot').first(), math.view.locator('.plus').first());
  await movePointerTo(page, targetBox);
  await expect(math.view.locator('.plus--distribution-drop')).toBeVisible();
  await page.mouse.up();
  await expect(math.view.locator('.distribution-preview__copy').first()).toBeVisible();
  const faces = await math.view.evaluate(view => {
    const face = el => { const c = getComputedStyle(el); return `${c.fontFamily}|${c.fontStyle}`; };
    const letter = view.querySelector('.distribution-preview__copy .term__label--symbol');
    const original = view.querySelector('.distribution-preview__original .term__label--symbol');
    const reference = view.querySelector('.factor-slot .term__label--symbol');
    return { copy: face(letter), original: face(original), reference: face(reference) };
  });
  expect(faces.copy).toBe(faces.reference);
  expect(faces.original).toBe(faces.reference);
  if (process.env.SHOT) await math.view.screenshot({ path: process.env.SHOT });
});
