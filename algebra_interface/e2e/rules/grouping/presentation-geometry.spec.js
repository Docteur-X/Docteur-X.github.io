import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';
import { multiSelect } from '../../support/mathAssertions.js';

/**
 * The grouping envelope is painted in a document-level overlay, after the
 * equation and its toolbars are updated. It must not move the actual operands
 * or change committed mathematics when the student previews and cancels.
 * This browser regression deliberately measures real viewport rectangles.
 */
test('grouping overlay encloses selected operands without shifting their layout', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Grouping presentation geometry');
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  const beforeMath = await math.astText();
  const beforeHistory = await math.historyCount();
  await multiSelect(page, [math.operand(0), math.operand(1)]);

  const selected = math.view.locator('.add-operand.is-multi-selected');
  await expect(selected).toHaveCount(2);
  // Measure operands relative to their equation container: Playwright may
  // scroll the workspace to click the floating edge button. A viewport shift
  // must not be mistaken for an operand moving within the equation.
  const relativeRects = () => selected.evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    const equation = node.closest('.equation') || nodes[0].parentElement;
    const base = equation.getBoundingClientRect();
    return { x: rect.x - base.x, y: rect.y - base.y,
      width: rect.width, height: rect.height };
  }));
  const before = await relativeRects();

  const envelope = page.locator('.grouping-envelope').first();
  await expect(envelope).toBeVisible();
  const assertGeometry = async () => {
    const after = await relativeRects();
    expect(after).toHaveLength(before.length);
    for (let i = 0; i < before.length; i += 1) {
      for (const key of ['x', 'y', 'width', 'height']) {
        expect(after[i][key]).toBeCloseTo(before[i][key], 1);
      }
    }
    // The overlay is fixed to the viewport while the operands participate in
    // document scrolling. Read both sets of rectangles in ONE browser task,
    // and retry while the overlay's scroll/resize frame is pending. A persistent
    // mismatch still fails: this is not a relaxed containment requirement.
    await expect.poll(async () => page.evaluate(() => {
      const overlay = document.querySelector('.grouping-envelope');
      const operands = [...document.querySelectorAll('.add-operand.is-multi-selected')];
      if (!overlay || operands.length !== 2) return false;
      const outer = overlay.getBoundingClientRect();
      return operands.every(operand => {
        const inner = operand.getBoundingClientRect();
        const tolerance = 1;
        return outer.left <= inner.left + tolerance &&
          outer.top <= inner.top + tolerance &&
          outer.right >= inner.right - tolerance &&
          outer.bottom >= inner.bottom - tolerance;
      });
    }), {
      message: 'Grouping overlay must contain both selected hitboxes after layout settles',
      timeout: 3000,
    }).toBe(true);
  };

  await assertGeometry();
  await page.getByRole('button', { name: 'Preview grouping of selected adjacent operands' }).first().click();
  await expect(envelope).toHaveClass(/grouping-envelope--preview/);
  await assertGeometry();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Confirm grouping', exact: true })).toBeHidden();
  expect(await math.astText()).toBe(beforeMath);
  expect(await math.historyCount()).toBe(beforeHistory);
});

/**
 * Viewport synchronisation is owned by groupingPreview, not the application
 * controller. Verify a real scroll while the modal bracket is visible: this
 * catches stale fixed-position geometry even when preview entry itself works.
 */
test('grouping preview remains aligned after scrolling the workspace', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Grouping scroll geometry');
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  await multiSelect(page, [math.operand(0), math.operand(1)]);
  await page.getByRole('button', { name: 'Preview grouping of selected adjacent operands' }).first().click();
  await expect(page.locator('.grouping-envelope--preview')).toBeVisible();

  // Scrolling must actually occur; otherwise this test proves nothing.
  const movement = await page.evaluate(() => {
    const before = window.scrollY;
    const spacer = document.createElement('div');
    spacer.dataset.testScrollSpacer = 'true';
    spacer.style.height = '1600px';
    document.body.append(spacer);
    window.scrollTo(0, before + 80);
    return { before, after: window.scrollY };
  });
  expect(movement.after).toBeGreaterThan(movement.before);

  await expect.poll(() => page.evaluate(() => {
    const overlay = document.querySelector('.grouping-envelope--preview');
    const operands = [...document.querySelectorAll('.add-operand.is-multi-selected')];
    if (!overlay || operands.length !== 2) return false;
    const outer = overlay.getBoundingClientRect();
    return operands.every(node => {
      const inner = node.getBoundingClientRect();
      return outer.left <= inner.left + 1 && outer.top <= inner.top + 1 &&
        outer.right >= inner.right - 1 && outer.bottom >= inner.bottom - 1;
    });
  }), { message: 'Grouping bracket must track viewport scroll', timeout: 3000 }).toBe(true);

  await page.keyboard.press('Escape');
  await expect(page.locator('.grouping-envelope--preview')).toHaveCount(0);
});
