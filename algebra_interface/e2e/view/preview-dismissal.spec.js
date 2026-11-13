/**
 * T4-3: dismissing a proposal must publish nothing and leave no preview behind.
 *
 * Each test here closes a gap found by a mutation sweep: removing the behaviour
 * left every existing test passing. Escape and click-away are separate handlers
 * for each preview family, so one family passing proves nothing about another.
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';
import { IdentityToolbar } from '../pages/IdentityToolbar.js';
import { beginPointerDrag, movePointerTo } from '../support/pointerGestures.js';
import { multiSelect } from '../support/mathAssertions.js';

async function start(page, expression) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Preview dismissal');
  const math = workspace.activeWindow();
  await math.build(expression);
  return { math, before: await math.astText(), history: await math.historyCount() };
}

async function expectUnchanged({ math, before, history }) {
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
}

/** A press on the panel background, clear of the mathematics and every menu. */
const clickAway = page => page.locator('.equation-panel').click({ position: { x: 12, y: 12 } });

async function openFactorisation(page, math) {
  const factors = math.view.getByRole('button', { name: 'Factor: a. Arrows reorder; click selects.', exact: true });
  await expect(factors).toHaveCount(2);
  await multiSelect(page, [factors.nth(0), factors.nth(1)]);
  await page.locator('#previewFactorisationButton').click();
  const confirm = page.getByRole('button', { name: 'Confirm extraction' });
  await expect(confirm).toBeVisible();
  return confirm;
}

async function openIdentity(page, math) {
  const identity = new IdentityToolbar(page);
  const box = await identity.start('Add', math.operand(0));
  await identity.hover(box, 'right');
  await identity.drop();
  const confirm = page.getByRole('button', { name: 'Confirm identity' });
  await expect(confirm).toBeVisible();
  return confirm;
}

async function openDistribution(page, math) {
  const { targetBox } = await beginPointerDrag(page,
    math.view.locator('.factor-slot').first(), math.view.locator('.plus').first());
  await movePointerTo(page, targetBox);
  await expect(math.view.locator('.plus--distribution-drop')).toBeVisible();
  await page.mouse.up();
  const copies = math.view.locator('.distribution-preview__copy');
  await expect(copies.first()).toBeVisible();
  return copies;
}

/** The clipboard must hold an operand first, so this builds the equation itself. */
async function startEqualityPreview(page) {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Preview dismissal');
  const math = workspace.activeWindow();
  await math.build('c');
  await page.locator('#copyMathButton').click();
  await math.build('a=b');
  const state = { math, before: await math.astText(), history: await math.historyCount() };
  const sign = math.view.locator('.relation-sign');
  await sign.click();
  await page.locator('[data-equality-context="add-right"]').click();
  await sign.click();
  await page.getByRole('button', { name: 'Use selected clipboard expression' }).click();
  const preview = math.view.locator('.equality-preview-math');
  await expect(preview).toBeVisible();
  return { ...state, preview };
}

test('Escape cancels a factorisation preview without publishing', async ({ page }) => {
  const state = await start(page, '(a*b+a*c)');
  const confirm = await openFactorisation(page, state.math);
  await page.keyboard.press('Escape');
  await expect(confirm).toBeHidden();
  await expectUnchanged(state);
});

test('Escape cancels an identity preview without publishing', async ({ page }) => {
  const state = await start(page, 'a+b');
  const confirm = await openIdentity(page, state.math);
  await page.keyboard.press('Escape');
  await expect(confirm).toBeHidden();
  await expectUnchanged(state);
});

test('Escape cancels an equality preview without publishing', async ({ page }) => {
  const state = await startEqualityPreview(page);
  await page.keyboard.press('Escape');
  await expect(state.preview).toHaveCount(0);
  await expectUnchanged(state);
});

test('clicking away cancels a distribution preview without publishing', async ({ page }) => {
  const state = await start(page, 'a*(b+c)');
  const copies = await openDistribution(page, state.math);
  await clickAway(page);
  await expect(copies).toHaveCount(0);
  await expectUnchanged(state);
});

test('clicking away cancels an identity preview without publishing', async ({ page }) => {
  const state = await start(page, 'a+b');
  const confirm = await openIdentity(page, state.math);
  await clickAway(page);
  await expect(confirm).toBeHidden();
  await expectUnchanged(state);
});

test('clicking away cancels an equality preview without publishing', async ({ page }) => {
  const state = await startEqualityPreview(page);
  await clickAway(page);
  await expect(state.preview).toHaveCount(0);
  await expectUnchanged(state);
});

test('the identity drag ghost is removed once its preview opens', async ({ page }) => {
  const state = await start(page, 'a+b');
  await openIdentity(page, state.math);
  await expect(page.locator('.identity-drag-ghost')).toHaveCount(0);
});

test('pointercancel over an eligible target does not publish the drag', async ({ page }) => {
  // Cancelling must be tested over a live target. Over empty space, even a
  // cancellation wrongly treated as a drop would commit nothing.
  const state = await start(page, '3+5+x');
  await page.evaluate(() => document.addEventListener('pointerdown', event => {
    window.__dragPointerId = event.pointerId;
  }, { capture: true, once: true }));
  const target = state.math.operand(1);
  const { targetBox } = await beginPointerDrag(page, state.math.operand(0), target);
  await movePointerTo(page, targetBox);
  await expect(target).toHaveClass(/is-combine-target/);
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel', {
    bubbles: true, pointerId: window.__dragPointerId, pointerType: 'mouse'
  })));
  await expect(page.locator('.drag-ghost')).toHaveCount(0);
  await page.mouse.up();
  await expectUnchanged(state);
});

test('restoring history by keyboard closes an open distribution preview', async ({ page }) => {
  // Keyboard activation bypasses pointer click-away. History restoration itself
  // must dismiss the preview before restoring the committed snapshot.
  const state = await start(page, 'a*(b+c)');
  await page.locator('#historyToggle').click();
  const copies = await openDistribution(page, state.math);
  const current = page.locator('#historyTree [data-history-id]').first();
  await current.focus();
  await page.keyboard.press('Enter');
  await expect(copies).toHaveCount(0);
  await expectUnchanged(state);
});

// Context replacements dismiss the proposal rather than applying it to a new AST.
test('building a new expression dismisses an open distribution preview', async ({ page }) => {
  const state = await start(page, 'a*(b+c)');
  const copies = await openDistribution(page, state.math);
  await state.math.build('x+y');
  await expect(copies).toHaveCount(0);
  expect(await state.math.astText()).toContain('x');
});

test('switching mathematical objects dismisses an open distribution preview', async ({ page }) => {
  const state = await start(page, 'a*(b+c)');
  page.once('dialog', dialog => dialog.accept('Second object'));
  await page.locator('#objectNew').click();
  await state.math.build('x+y');
  await page.getByRole('button', { name: 'Object 1', exact: true }).click();
  const copies = await openDistribution(page, state.math);
  await page.getByRole('button', { name: 'Second object', exact: true }).click();
  await expect(copies).toHaveCount(0);
  expect(await state.math.astText()).toContain('x');
});

// Context creation and duplication are navigation, not mathematical commits.
// Their actions must dismiss the proposal before opening the new document.
test('creating a document dismisses an open distribution preview', async ({ page }) => {
  const state = await start(page, 'a*(b+c)');
  const copies = await openDistribution(page, state.math);
  page.once('dialog', dialog => dialog.accept('New during preview'));
  await page.getByRole('button', { name: 'New document' }).click();
  await expect(copies).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New during preview' })).toBeVisible();
});

test('invalid imported JSON does not dismiss a distribution preview', async ({ page }) => {
  const state = await start(page, 'a*(b+c)');
  const copies = await openDistribution(page, state.math);
  await page.locator('#workspaceImport').setInputFiles({
    name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{bad json')
  });
  await expect(copies).toHaveCount(2);
  await expect(page.getByText(/Import failed:/)).toBeVisible();
  await expectUnchanged(state);
});

/**
 * Full equation rerenders replace all semantic hitboxes. A detached negation
 * confirmation target must never survive such a replacement or publish a
 * transformation from the previous DOM generation.
 */
test('changing multiplication display dismisses a negation preview without publishing', async ({ page }) => {
  const state = await start(page, '-(a+b)');
  await state.math.view.locator('.negate-operator-hitbox').click();
  const preview = page.getByTestId('negation-preview');
  await expect(preview).toBeVisible();

  // This is a presentation-only rerender, not a mathematical transformation.
  await page.getByRole('combobox', { name: 'Multiplication display' }).selectOption('dot');
  await expect(preview).toHaveCount(0);
  await expectUnchanged(state);

  // The modal lease must have been released, allowing the operator to reopen.
  await state.math.view.locator('.negate-operator-hitbox').click();
  await expect(preview).toBeVisible();
  await page.keyboard.press('Escape');
  await expectUnchanged(state);
});
