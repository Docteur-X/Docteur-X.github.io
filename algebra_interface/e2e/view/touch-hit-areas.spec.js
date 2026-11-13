/**
 * R2 option B (owner, 12 November 2026): on a touch screen every part has a
 * tap area of at least 44 px, drawn by an invisible pseudo-element, so the
 * layout does not move. A desktop pointer is unchanged.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';

async function start(page) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Touch');
  const math = workspace.activeWindow();
  await math.build('(-3)+a');
  return math;
}
// Which occurrence is "hit" a few pixels above a small nested part? The part
// is scrolled into view first: elementFromPoint finds nothing off-screen
// (lesson 5 in Known Issues: make sure a probe reaches the state it tests).
// The probe point is half-way into the extra tap area, which is (44 - height)/2
// above the box: the box's height depends on the maths font (13 November 2026),
// so a fixed offset would test the font, not the rule.
const hitAbove = async (page, selector, offset = null) => {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  return page.evaluate(([sel, fixed]) => {
  const target = document.querySelector(sel);
  const r = target.getBoundingClientRect();
  const dy = fixed ?? (44 - r.height) / 4;
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top - dy);
  return { size: [Math.round(r.width), Math.round(r.height)],
    hitsTarget: hit?.closest('[data-hitbox-role="occurrence"]') === target };
  }, [selector, offset]);
};

test.describe('touch screen', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 700, height: 1000 } });
  test('a small nested part is tappable just outside its box, and the layout is unchanged', async ({ page }) => {
    await start(page);
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const result = await hitAbove(page, '.nested-occurrence');
    expect(result.size[1]).toBeLessThan(44); // the visible box is still small
    expect(result.hitsTarget).toBe(true);
  });
});

test('desktop pointer: no extra hit area', async ({ page }) => {
  await start(page);
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(false);
  expect((await hitAbove(page, '.nested-occurrence', 4)).hitsTarget).toBe(false);
});
