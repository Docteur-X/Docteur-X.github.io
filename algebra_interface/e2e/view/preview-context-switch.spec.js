import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';
import { IdentityToolbar } from '../pages/IdentityToolbar.js';
import { multiSelect } from '../support/mathAssertions.js';

/**
 * Object switching is an explicit mathematical-context boundary. The feature
 * adapter must remove its own temporary presentation, while the shared preview
 * host releases the modal lease before the new object is mounted. Returning to
 * the original object must not resurrect a proposal or publish a history node.
 */
async function createSecondObject(page, math) {
  page.once('dialog', dialog => dialog.accept('Second object'));
  await page.getByRole('button', { name: 'New object' }).click();
  await math.build('x+y');
  await page.getByRole('button', { name: 'Object 1', exact: true }).click();
}

async function switchAndVerify(page, math, before, history) {
  await page.getByRole('button', { name: 'Second object', exact: true }).click();
  await expect.poll(() => math.astText()).toContain('x');
  await page.getByRole('button', { name: 'Object 1', exact: true }).click();
  await expect.poll(() => math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
}

test('object navigation switches immediately without an active preview', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Object navigation baseline');
  const math = workspace.activeWindow();
  await math.build('a+b');
  await createSecondObject(page, math);
  const before = await math.astText();
  const history = await math.historyCount();
  await switchAndVerify(page, math, before, history);
});

test('object switch dismisses identity candidate and releases its lease', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Identity context boundary');
  const math = workspace.activeWindow();
  await math.build('a+b');
  await createSecondObject(page, math);
  const before = await math.astText();
  const history = await math.historyCount();

  const identity = new IdentityToolbar(page);
  const box = await identity.start('Add', math.operand(0));
  await identity.hover(box, 'right');
  await identity.drop();
  await expect(page.getByRole('button', { name: 'Confirm identity' })).toBeVisible();
  await switchAndVerify(page, math, before, history);
  await expect(page.locator('.identity-preview-overlay')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Confirm identity' })).toHaveCount(0);

  // A second candidate must be possible: no modal lease survived navigation.
  const next = await identity.start('Add', math.operand(0));
  await identity.hover(next, 'right');
  await identity.drop();
  await expect(page.getByRole('button', { name: 'Confirm identity' })).toBeVisible();
  await identity.cancel();
  expect(await math.historyCount()).toBe(history);
});

test('object switch removes factorisation provenance and releases its lease', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Factorisation context boundary');
  const math = workspace.activeWindow();
  await math.build('(a*b+a*c)');
  await createSecondObject(page, math);
  const before = await math.astText();
  const history = await math.historyCount();

  async function openPreview() {
    const factors = math.view.getByRole('button', {
      name: 'Factor: a. Arrows reorder; click selects.', exact: true
    });
    await expect(factors).toHaveCount(2);
    await multiSelect(page, [factors.nth(0), factors.nth(1)]);
    await page.locator('#previewFactorisationButton').click();
    await expect(page.getByRole('button', { name: 'Confirm extraction' })).toBeVisible();
  }
  await openPreview();
  await expect(page.locator('.transformation-preview__persistent')).toBeVisible();
  await switchAndVerify(page, math, before, history);
  await expect(page.locator('.transformation-preview__persistent')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Confirm extraction' })).toHaveCount(0);

  await page.keyboard.press('Escape'); // clear any non-modal selection left by navigation
  await openPreview();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
});
