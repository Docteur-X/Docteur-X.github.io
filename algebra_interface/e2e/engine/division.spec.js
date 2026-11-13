/**
 * Division as Invert (stages D1 and D2), in the browser. The owner's table
 * (decision 0.3 and the answers of 12 November 2026):
 *   a÷b×c   drag [÷b] to the front   →  1÷b×a×c   (a new, real 1 leads)
 *   1÷b×a×c drag the 1 to the end    →  1÷b×a×c×1 (another new 1 leads)
 *           drop the 1 onto c        →  nothing (the leading 1 is locked)
 *   6÷2     drop ÷2 onto 6           →  3
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';

async function setup(page, expression) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Division');
  const math = workspace.activeWindow();
  await math.build(expression);
  return math;
}
const factor = (math, text) => math.view.locator('.factor-slot').filter({ hasText: text }).first();

/** Drag `from` to the point `x` pixels left of `to`'s left edge (a gap), or onto `to`. */
async function drag(page, from, to, { gapBefore = false, gapAfter = false } = {}) {
  await from.scrollIntoViewIfNeeded();
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  const target = gapBefore ? { x: b.x - 2, y: b.y + b.height / 2 }
    : gapAfter ? { x: b.x + b.width + 2, y: b.y + b.height / 2 } : { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2, { steps: 3 });
  await page.mouse.move(target.x, target.y, { steps: 10 });
  expect(await page.evaluate(() => window.manipulatorDiagnostics.mode())).toBe('dragging');
  // Let a rearrangement preview settle before releasing (it is seen before it commits).
  await page.waitForTimeout(450);
  await page.mouse.up();
}

test('a÷b×c shows [÷b] as one factor, with no × before it', async ({ page }) => {
  const math = await setup(page, 'a÷b×c');
  await expect(page.locator('#expressionInput')).toHaveValue('a/b×c');
  const divisor = factor(math, /^÷\s*b$/);
  await expect(divisor).toHaveCount(1);
  await expect(divisor.locator('.invert-sign')).toHaveText('÷');
  // Exactly one × sign is drawn (before c), none before ÷b.
  await expect(math.view.locator('.multiply-operator').filter({ hasText: '×' })).toHaveCount(1);
});

test('dragging [÷b] to the front gives 1÷b×a×c; dragging the 1 to the end brings a new 1', async ({ page }) => {
  const math = await setup(page, 'a÷b×c');
  // [÷b] is dragged by its ÷ sign (pressing the b inside selects the b, as with −b).
  await drag(page, factor(math, /^÷\s*b$/).locator('.invert-sign'), factor(math, /^a$/), { gapBefore: true });
  await expect(page.locator('#expressionInput')).toHaveValue('1/b×a×c');
  // The locked 1 cannot be combined away: dropped ONTO c, nothing changes.
  await drag(page, factor(math, /^1$/), factor(math, /^c$/));
  await expect(page.locator('#expressionInput')).toHaveValue('1/b×a×c');
  // But it can be moved (owner's answer 1): into the gap after c, a new 1 leads.
  await drag(page, factor(math, /^1$/), factor(math, /^c$/), { gapAfter: true });
  await expect(page.locator('#expressionInput')).toHaveValue('1/b×a×c×1');
});

test('dropping ÷2 onto 6 makes 3', async ({ page }) => {
  const math = await setup(page, '6÷2');
  await drag(page, factor(math, /^÷\s*2$/).locator('.invert-sign'), factor(math, /^6$/));
  await expect(page.locator('#expressionInput')).toHaveValue('3');
});

// Stage D3: b÷b = 1 and 0·a÷b = 0 rely on b ≠ 0. The assumption is shown on
// the status line and kept beside the step in history (owner, 12 November 2026).
test('dropping ÷b onto b makes 1, assuming b ≠ 0, shown in history', async ({ page }) => {
  const math = await setup(page, 'a×b÷b');
  await drag(page, factor(math, /^÷\s*b$/).locator('.invert-sign'), factor(math, /^b$/));
  await expect(page.locator('#expressionInput')).toHaveValue('a×1');
  await expect(page.locator('#statusMessage')).toContainText('assuming b ≠ 0');
  await expect(page.locator('.history-node-assumptions').last()).toHaveText('assuming b ≠ 0');
});

test('0 dropped onto a in 0a÷b makes 0, assuming b ≠ 0', async ({ page }) => {
  const math = await setup(page, '0a÷b');
  await drag(page, factor(math, /^0$/), factor(math, /^a$/));
  await expect(page.locator('#expressionInput')).toHaveValue('0');
  await expect(page.locator('#statusMessage')).toContainText('assuming b ≠ 0');
  await expect(page.locator('.history-node-assumptions').last()).toHaveText('assuming b ≠ 0');
});


// Owner, 12 November 2026: a ÷ factor uses the same reorder preview as any
// factor (the boxes slide into the new order), never a bare insertion bar.
// When ÷d would come first, the preview already shows the 1 it will gain.
test('dragging [÷d] shows the normal reorder preview, with the leading 1 when it goes first', async ({ page }) => {
  const math = await setup(page, 'a c b÷d');
  const sign = factor(math, /^÷\s*d$/).locator('.invert-sign');
  await sign.scrollIntoViewIfNeeded();
  const start = await sign.boundingBox();
  const b = await factor(math, /^b$/).boundingBox();
  const a = await factor(math, /^a$/).boundingBox();
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + start.width / 2 - 12, start.y + start.height / 2, { steps: 4 });
  // Just inside b's left edge: the gap between c and b.
  await page.mouse.move(b.x + 3, b.y + b.height / 2, { steps: 10 });
  await expect(page.locator('.drag-rearrangement-preview')).toHaveCount(1);
  await expect(page.locator('.drag-insertion-marker:not([hidden])')).toHaveCount(0);
  // To the front: the preview shows the new 1 before ÷d.
  await page.mouse.move(a.x - 3, a.y + a.height / 2, { steps: 10 });
  await expect(page.locator('.drag-rearrangement-preview .preview-leading-one')).toHaveCount(1);
  await page.waitForTimeout(450);
  await page.mouse.up();
  await expect(page.locator('#expressionInput')).toHaveValue('1/d·a c b');
});
