/**
 * Visual safety net for stylesheet work (not part of the normal test suite).
 *
 * Each state below is photographed in both themes and both hitbox modes, then
 * compared with a baseline from a known-good version. It answers one question:
 * "did this CSS change alter anything I can see?" It says nothing about whether
 * the mathematics is right; that is the job of the Node and browser suites.
 *
 * Add a state whenever a new preview or feedback role is added.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../e2e/pages/WorkspacePage.js';
import { IdentityToolbar } from '../e2e/pages/IdentityToolbar.js';
import { beginPointerDrag, movePointerTo } from '../e2e/support/pointerGestures.js';
import { multiSelect } from '../e2e/support/mathAssertions.js';
import { writeComputedStyles } from './computedStyles.js';

// With this set, each state records exact computed styles instead of a screenshot.
const STYLE_CAPTURE_FOLDER = process.env.VISUAL_STYLE_CAPTURE;
async function observe(page, name, screenshotOptions = {}) {
  // Let timing settle, or two runs of identical code would disagree: the browser
  // updates :hover shortly after a re-render, and a document tab's label (so its
  // width) changes when autosave fires after 350 ms.
  await page.waitForTimeout(600);
  if (STYLE_CAPTURE_FOLDER) await writeComputedStyles(page, STYLE_CAPTURE_FOLDER, name);
  else await expect(page).toHaveScreenshot(`${name}.png`, screenshotOptions);
}

const build = async (math, expression) => math.build(expression);
const center = box => [box.x + box.width / 2, box.y + box.height / 2];

/** Press Add on the identity tool and rest over the left operand's right half. */
async function dragIdentity(page, math, operation = 'Add') {
  const identity = new IdentityToolbar(page);
  const box = await identity.start(operation, math.operand(0));
  await identity.hover(box, 'right');
  await expect(math.view.locator('.math-feedback--proposed-target')).toHaveCount(1);
  return identity;
}
async function openIdentity(page, math, operation) {
  const identity = await dragIdentity(page, math, operation);
  await identity.drop();
  await expect(page.locator('.identity-preview-new')).toBeVisible();
}
async function dragToPlus(page, math) {
  const { targetBox } = await beginPointerDrag(page,
    math.view.locator('.factor-slot').first(), math.view.locator('.plus').first());
  await movePointerTo(page, targetBox);
  await expect(math.view.locator('.plus--distribution-drop')).toBeVisible();
}
async function openDistribution(page, math) {
  await dragToPlus(page, math);
  await page.mouse.up();
  await expect(math.view.locator('.distribution-preview__copy').first()).toBeVisible();
}
async function selectFactors(page, math) {
  const factors = math.view.getByRole('button', { name: 'Factor: a. Arrows reorder; click selects.', exact: true });
  await multiSelect(page, [factors.nth(0), factors.nth(1)]);
}
async function openEquality(page, math, equation = 'a=b') {
  await build(math, 'c+d');
  await page.locator('#copyMathButton').click();
  await build(math, equation);
  const sign = math.view.locator('.relation-sign');
  await sign.click();
  await page.locator('[data-equality-context="add-right"]').click();
  await sign.click();
}

/** Every entry sets up one state; the pointer stays wherever the state needs it. */
const STATES = {
  'expression-nested': async (page, math) => { await build(math, 'a(b+c)+[(3)]-d·-e'); },
  'equation-resting': async (page, math) => { await build(math, '2x+1=a(b-c)'); },
  'term-selected': async (page, math) => { await build(math, 'a+b+c'); await math.operand(1).click(); },
  'term-hovered': async (page, math) => { await build(math, 'a+(b c)'); await math.operand(1).hover(); },
  'range-selected': async (page, math) => {
    await build(math, 'a+b+c');
    await multiSelect(page, [math.operand(0), math.operand(1)]);
  },
  'grouping-preview': async (page, math) => {
    await build(math, 'a+b+c');
    await multiSelect(page, [math.operand(0), math.operand(1)]);
    await page.locator('#wrapGroupButton').click();
    await expect(page.locator('.grouping-envelope--preview')).toBeVisible();
  },
  'factors-selected': async (page, math) => { await build(math, '(a*b+a*c)'); await selectFactors(page, math); },
  'factorisation-preview': async (page, math) => {
    await build(math, '(a*b+a*c)');
    await selectFactors(page, math);
    await page.locator('#previewFactorisationButton').click();
    await expect(page.getByRole('button', { name: 'Confirm extraction' })).toBeVisible();
  },
  'distribution-target': async (page, math) => { await build(math, 'a(b+c)'); await dragToPlus(page, math); },
  'distribution-preview': async (page, math) => { await build(math, 'a(b+c)'); await openDistribution(page, math); },
  'distribution-copy-hovered': async (page, math) => {
    await build(math, 'a(b+c)');
    await openDistribution(page, math);
    await math.view.locator('.distribution-preview__copy').first().hover();
  },
  'combine-target': async (page, math) => {
    await build(math, '3+5+x');
    const { targetBox } = await beginPointerDrag(page, math.operand(0), math.operand(1));
    await movePointerTo(page, targetBox);
    await expect(math.operand(1)).toHaveClass(/is-combine-target/);
  },
  'rearrangement-preview': async (page, math) => {
    await build(math, 'a+b+c');
    await beginPointerDrag(page, math.operand(0), math.operand(2));
    // Measure after the drag helper has scrolled both terms into view.
    const last = await math.operand(2).boundingBox();
    await page.mouse.move(last.x + last.width + 8, last.y + last.height / 2, { steps: 8 });
    await expect(page.locator('.drag-rearrangement-preview')).toBeVisible();
  },
  'identity-drag-add': async (page, math) => { await build(math, 'a+b'); await dragIdentity(page, math); },
  'identity-drag-product': async (page, math) => {
    await build(math, 'a b+a c');
    const identity = new IdentityToolbar(page);
    const box = await identity.start('Add', math.operand(0));
    await page.mouse.move(box.x + 3, box.y + box.height / 2, { steps: 8 });
    await expect(math.view.locator('.math-feedback--proposed-target')).toHaveCount(1);
  },
  'identity-preview-add': async (page, math) => { await build(math, 'a+b'); await openIdentity(page, math); },
  'identity-preview-multiply': async (page, math) => { await build(math, 'a+b'); await openIdentity(page, math, 'Multiply'); },
  'identity-preview-hovered': async (page, math) => {
    await build(math, 'a+b');
    await openIdentity(page, math);
    await page.locator('.identity-preview-new').hover();
  },
  'negation-preview': async (page, math) => {
    await build(math, 'a-b');
    await math.minusSign().click();
    await page.locator('#selectionLabel').hover();
    await expect(math.view.locator('.math-feedback--proposed-insertion')).toBeVisible();
  },
  'negation-preview-hovered': async (page, math) => {
    await build(math, 'a-b');
    await math.minusSign().click();
    await math.view.locator('.math-feedback--proposed-insertion').hover();
  },
  'compression-eligible': async (page, math) => {
    await build(math, '-1*(a+b)');
    const source = math.view.locator('.factor-slot').first();
    const group = math.view.locator('.factor-slot').nth(1);
    await beginPointerDrag(page, source, group);
    const box = await group.boundingBox();
    await page.mouse.move(box.x + 6, box.y + box.height / 2, { steps: 8 });
    await expect(group).toHaveClass(/math-feedback--eligible/);
  },
  'compression-preview': async (page, math) => {
    await build(math, '-1*(a+b)');
    const source = math.view.locator('.factor-slot').first();
    const group = math.view.locator('.factor-slot').nth(1);
    await beginPointerDrag(page, source, group);
    const box = await group.boundingBox();
    await page.mouse.move(box.x + 6, box.y + box.height / 2, { steps: 8 });
    await expect(group).toHaveClass(/math-feedback--eligible/);
    await page.mouse.up();
    await expect(page.getByTestId('negation-preview')).toBeVisible();
    await page.locator('#selectionLabel').hover();
  },
  'equality-menu-armed': async (page, math) => { await openEquality(page, math); await page.locator('#selectionLabel').hover(); },
  'equality-preview': async (page, math) => {
    await openEquality(page, math);
    await page.getByRole('button', { name: 'Use selected clipboard expression' }).click();
    await expect(math.view.locator('.equality-preview-math')).toBeVisible();
    await page.locator('#selectionLabel').hover();
  },
  'equality-preview-hovered': async (page, math) => {
    await openEquality(page, math);
    await page.getByRole('button', { name: 'Use selected clipboard expression' }).click();
    await math.view.locator('.math-feedback--proposed-insertion').first().hover();
  },
  'equality-truth': async (page, math) => { await build(math, '3=3'); await page.locator('#selectionLabel').hover(); },
  'equality-false': async (page, math) => { await build(math, '3=4'); await page.locator('#selectionLabel').hover(); },
  'equality-preview-compound': async (page, math) => {
    await openEquality(page, math, 'x y=z');
    await page.getByRole('button', { name: 'Use selected clipboard expression' }).click();
    await expect(math.view.locator('.equality-preview-math')).toBeVisible();
    await page.locator('#selectionLabel').hover();
  },
  'clipboard-drag-over-equality': async (page, math) => {
    await openEquality(page, math);
    await page.locator('#clipboardPanel > summary').click();
    const source = await page.locator('.clipboard-draggable').first().boundingBox();
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
    await page.mouse.down();
    const sign = await math.view.locator('.relation-sign').boundingBox();
    await page.mouse.move(sign.x + sign.width / 2, sign.y + sign.height / 2, { steps: 8 });
    await expect(page.locator('.clipboard-drag-ghost')).toBeVisible();
    await expect(math.view.locator('.relation-root').first()).toBeVisible();
  },
  'variable-substitution': async (page, math) => {
    await build(math, 'x+1');
    await page.locator('.variable-input').first().fill('5');
    await page.locator('.variable-input').first().press('Enter');
    await page.locator('#selectionLabel').hover();
  },
  'term-focused': async (page, math) => {
    await build(math, 'a+b c');
    await page.keyboard.press('Tab');
    await math.operand(0).focus();
    await expect(math.view.locator('.term:focus-visible')).toHaveCount(1);
  },
  'product-focused': async (page, math) => {
    await build(math, 'a+b c');
    await page.keyboard.press('Tab');
    await math.operand(1).focus();
    await expect(math.view.locator('.term:focus-visible')).toHaveCount(1);
  },
  'nested-occurrence-hovered': async (page, math) => {
    await build(math, 'a+[(3)]');
    await math.view.locator('.nested-occurrence').first().hover();
  },
  'factor-combine-target': async (page, math) => {
    await build(math, '2*3+x');
    const factors = math.view.locator('.factor-slot');
    const { targetBox } = await beginPointerDrag(page, factors.nth(0), factors.nth(1));
    await movePointerTo(page, targetBox);
    await expect(factors.nth(1)).toHaveClass(/is-combine-target/);
  },
  'factorisation-zone-hovered': async (page, math) => {
    await build(math, '(a*b+a*c)');
    await selectFactors(page, math);
    await page.locator('.factorisation-zone').first().hover();
  },
  'factorisation-confirm-hovered': async (page, math) => {
    await build(math, '(a*b+a*c)');
    await selectFactors(page, math);
    await page.locator('#previewFactorisationButton').click();
    await page.locator('.transformation-preview__confirm').first().hover();
  },
  'grouping-edge-hovered': async (page, math) => {
    await build(math, 'a+b+c');
    await multiSelect(page, [math.operand(0), math.operand(1)]);
    await page.locator('.grouping-envelope__edge').first().hover({ force: true });
  },
  'grouping-preview-hovered': async (page, math) => {
    await build(math, 'a+b+c');
    await multiSelect(page, [math.operand(0), math.operand(1)]);
    await page.locator('#wrapGroupButton').click();
    await page.locator('.grouping-envelope--preview').hover();
  },
  'select-multiple-on': async (page, math) => {
    await build(math, 'a+b');
    await page.locator('#multiSelectButton').click();
    await page.locator('#selectionLabel').hover();
  },
  'inspector-open': async (page, math) => {
    await build(math, 'a+b');
    await page.locator('.mathjson-inspector > summary').click();
    await page.locator('#selectionLabel').hover();
  },
  'history-node-hovered': async (page, math) => {
    await build(math, 'a+b');
    await page.locator('#historyToggle').click();
    await page.locator('.history-node-button').first().hover();
  },
  'dialog-close-hovered': async (page, math) => {
    await build(math, 'a+b');
    await page.locator('#openHistoryGraphButton').click();
    await page.locator('.history-dialog .icon-button').first().hover();
  },
};

for (const theme of ['light', 'dark']) {
  for (const visibility of ['visible', 'hover']) {
    test.describe(`${theme} ${visibility}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await new WorkspacePage(page).createDocument('Visual');
        if (theme === 'dark') await page.locator('#themeToggle').click();
        await page.locator('#hitboxVisibilityMode').selectOption(visibility);
      });
      for (const [name, setUp] of Object.entries(STATES)) {
        test(name, async ({ page }) => {
          const math = new WorkspacePage(page).activeWindow();
          await setUp(page, math);
          await observe(page, `${name}-${theme}-${visibility}`, {
            // Node IDs change between runs, so the navigator's readout is covered.
            mask: [page.getByTestId('structure-navigation-current')]
          });
        });
      }
    });
  }
}

/** Page furniture, once per theme, as a full page and at phone width. */
for (const theme of ['light', 'dark']) {
  test.describe(`page ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      if (theme === 'dark') await page.locator('#themeToggle').click();
    });
    const mask = page => [page.getByTestId('structure-navigation-current')];
    test('empty workspace', async ({ page }) => {
      await observe(page, `page-empty-${theme}`, { fullPage: true });
    });
    test('full page with history open', async ({ page }) => {
      await new WorkspacePage(page).createDocument('Visual');
      const math = new WorkspacePage(page).activeWindow();
      await math.build('a+b');
      await math.build('c(d+e)');
      await page.locator('#historyToggle').click();
      await page.mouse.move(0, 0);
      await observe(page, `page-history-${theme}`, { fullPage: true, mask: mask(page) });
    });
    test('history dialog', async ({ page }) => {
      await new WorkspacePage(page).createDocument('Visual');
      await new WorkspacePage(page).activeWindow().build('a+b');
      await page.locator('#openHistoryGraphButton').click();
      await observe(page, `page-history-dialog-${theme}`, { mask: mask(page) });
    });
    test('phone width', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await new WorkspacePage(page).createDocument('Visual');
      await new WorkspacePage(page).activeWindow().build('a(b+c)+d');
      await page.mouse.move(0, 0);
      await observe(page, `page-phone-${theme}`, { fullPage: true, mask: mask(page) });
    });
  });
}
