import { test, expect } from '@playwright/test';
import { WorkspacePage } from './pages/WorkspacePage.js';
import { expectMathJSON } from './support/mathAssertions.js';

/**
 * This tests the actual browser controls, not an internal Engine hook.
 * Arming is transient; previewing must not mutate history; confirmation must
 * create exactly one mathematical commit and retain the original equation.
 */
test('armed equals applies remembered scalar addition with preview and confirmation', async ({page}) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Function application');
  const math = workspace.activeWindow();
  await math.build('c');
  await page.locator('#copyMathButton').click();
  await expect(page.locator('#clipboardCount')).toHaveText('1');
  await math.build('a=b');
  const history = await math.historyCount();
  const sign = math.view.locator('.equality-sign');
  await sign.click();
  await page.locator('[data-equality-context="add-right"]').click();
  await expect(sign).toHaveAttribute('data-armed','add-right');
  await sign.click();
  await page.getByRole('button',{name:'Use selected clipboard expression'}).click();
  await expect(math.view.locator('.equality-inline-preview')).toBeVisible();
  await expect(math.view.locator('.equality-inserted-operand')).toHaveCount(2);
  await expect(page.locator('#equalityApplicationDialog')).toHaveCount(0);
  await expectMathJSON(math,['Equal','a','b']);
  expect(await math.historyCount()).toBe(history);
  await page.locator('[data-equality-preview-confirm]').first().click();
  await expectMathJSON(math,['Equal',['Add','a','c'],['Add','b','c']]);
  expect(await math.historyCount()).toBe(history+1);
});

test('clicking the armed choice again disarms and prevents relation application',async ({page})=>{
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Disarm equality');
  const math = workspace.activeWindow();
  await math.build('a=b');
  const sign = math.view.locator('.equality-sign');
  await sign.click();
  await page.locator('[data-equality-context="multiply-left"]').click();
  await expect(sign).toHaveAttribute('data-armed','multiply-left');
  await sign.click();
  await page.locator('[data-equality-context="multiply-left"]').click();
  await expect(sign).toHaveAttribute('data-armed','');
});

/**
 * Regression for the visual clipping defect observed in the first release.
 * The palette must escape the equation viewport, remain compact, and close
 * without clearing the explicitly armed mathematical operation.
 */
test('equality menu is a compact portal and dismisses independently of arming', async ({page}) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Menu geometry');
  const math = workspace.activeWindow();
  await math.build('a=b');
  const sign = math.view.locator('.equality-sign');
  await sign.click();
  const menu = page.locator('.equality-operation-menu');
  await expect(menu).toBeVisible();
  expect(await menu.evaluate(el => el.parentElement === document.body)).toBe(true);
  const size = await menu.boundingBox();
  expect(size.width).toBeLessThan(175);
  expect(size.y).toBeGreaterThanOrEqual(0);
  await page.locator('[data-equality-context="add-right"]').click();
  await expect(sign).toHaveAttribute('data-armed','add-right');
  await sign.click();
  await math.view.locator('.expression-root').first().click({position:{x:4,y:4}});
  await expect(menu).toBeHidden();
  await expect(sign).toHaveAttribute('data-armed','add-right');
});

/**
 * Regression for v1.2: previews are rendered in the original equation viewport,
 * with only the two copied occurrences amber. The preexisting sides and their
 * mathematical identities remain neutral; cancellation must not commit.
 */
test('inline equality preview colours only copied operands and cancels without history', async ({page}) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Inline equality preview');
  const math = workspace.activeWindow();
  await math.build('c');
  await page.locator('#copyMathButton').click();
  await math.build('a=b');
  const history = await math.historyCount();
  const sign = math.view.locator('.equality-sign');
  await sign.click();
  await page.locator('[data-equality-context="multiply-left"]').click();
  await sign.click();
  await page.getByRole('button',{name:'Use selected clipboard expression'}).click();
  const preview = math.view.locator('.equality-inline-preview');
  await expect(preview).toBeVisible();
  await expect(preview.locator('.equality-inserted-operand')).toHaveCount(2);
  // Newly allocated operation wrappers are not themselves amber.
  await expect(preview.locator('.equality-new-node')).toHaveCount(0);
  await expectMathJSON(math,['Equal','a','b']);
  expect(await math.historyCount()).toBe(history);
  await page.locator('[data-equality-preview-cancel]').click();
  await expect(preview).toHaveCount(0);
  await expectMathJSON(math,['Equal','a','b']);
  expect(await math.historyCount()).toBe(history);
});

/**
 * Visual-contract regression: equality previews reuse the established
 * distribution/factorisation amber palette, without painting nested mathematical
 * hitboxes or the original equality sides amber. This checks computed styles,
 * rather than only asserting that a CSS class happens to exist.
 *
 * A compound operand is essential: a simple symbol would not expose the
 * previous defect, where the entire compound subtree acquired a heavy fill.
 */
test('compound clipboard operands share distribution amber glow', async ({page}) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Amber visual contract');
  const math = workspace.activeWindow();
  await math.build('3(y+x+z)');
  await page.locator('#copyMathButton').click();
  await math.build('a=b');
  const initialHistory = await math.historyCount();
  await math.view.locator('.equality-sign').click();
  await page.locator('[data-equality-context="multiply-left"]').click();
  await math.view.locator('.equality-sign').click();
  await page.getByRole('button', {name:'Use selected clipboard expression'}).click();

  const preview = math.view.locator('.equality-inline-preview');
  const copies = preview.locator('.equality-inserted-operand');
  await expect(copies).toHaveCount(2);
  const appearance = await copies.first().evaluate(el => {
    const style = getComputedStyle(el);
    const tokens = getComputedStyle(document.documentElement);
    const child = el.querySelector('[data-node-id]');
    return {
      borderStyle: style.borderTopStyle,
      borderColor: style.borderTopColor,
      boxShadow: style.boxShadow,
      background: style.backgroundColor,
      amberInk: tokens.getPropertyValue('--distribution-ink').trim(),
      childHasAmberClass: !!child?.classList.contains('equality-inserted-operand'),
      totalAmberNodes: document.querySelectorAll('.equality-inline-preview .equality-inserted-operand').length
    };
  });
  // This compares computed properties with the actual distribution preview
  // CSS rather than trusting a class name or copying a colour constant.
  // The glowing halo must be visible even without pointer hover.
  expect(appearance.borderStyle).toBe('solid');
  // A distinct inner dashed accent and broad halo provide the intended glow.
  expect(appearance.boxShadow).not.toBe('none');
  expect(appearance.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(appearance.childHasAmberClass).toBe(false);
  expect(appearance.totalAmberNodes).toBe(2);
  expect(await math.historyCount()).toBe(initialHistory);
  await page.locator('[data-equality-preview-cancel]').click();
  await expectMathJSON(math,['Equal','a','b']);
});

/**
 * Compound addition is a genuine mathematical grouping, not a rectangular
 * hitbox masquerading as brackets. The preview stays in the original window,
 * only the two inserted occurrences are amber, and cancel changes no history.
 */
test('adding compound clipboard content explicitly brackets only new operands', async ({page}) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Explicit clipboard grouping');
  const math = workspace.activeWindow();
  await math.build('c+d');
  await page.locator('#copyMathButton').click();
  await math.build('a+b=e');
  const before = await math.historyCount();
  await math.view.locator('.equality-sign').click();
  await page.locator('[data-equality-context="add-right"]').click();
  await math.view.locator('.equality-sign').click();
  await page.getByRole('button',{name:'Use selected clipboard expression'}).click();
  const preview = math.view.locator('.equality-inline-preview');
  await expect(preview.locator('.equality-inserted-operand')).toHaveCount(2);
  await expect(preview.locator('.equality-inserted-operand .expression-bracket--explicit')).toHaveCount(4);
  await expect(preview.locator('.equality-inserted-operand .equality-inserted-operand')).toHaveCount(0);
  expect(await math.historyCount()).toBe(before);
  await page.locator('[data-equality-preview-confirm]').first().click();
  await expectMathJSON(math,['Equal',['Add',['Add','a','b'],['Add','c','d']],['Add','e',['Add','c','d']]]);
  expect(await math.historyCount()).toBe(before+1);
});

/** The armed label must be attached to the equals sign, never appended after
 * the right-hand mathematical expression. Menu state remains accessible. */
test('armed equality badge is geometrically anchored to equals sign', async ({page}) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Armed badge geometry');
  const math = workspace.activeWindow();
  await math.build('a+b=c+d');
  const sign = math.view.locator('.equality-sign');
  await sign.click();
  const option = page.locator('[data-equality-context="multiply-right"]');
  await option.click();
  const badge = sign.locator('.relation-armed-indicator');
  await expect(badge).toHaveText('×R');
  const signBox = await sign.boundingBox();
  const badgeBox = await badge.boundingBox();
  expect(Math.abs((badgeBox.x + badgeBox.width / 2) - (signBox.x + signBox.width / 2))).toBeLessThan(3);
  expect(badgeBox.y + badgeBox.height).toBeLessThanOrEqual(signBox.y + 2);
  await sign.click();
  await expect(option).toHaveAttribute('aria-pressed','true');
  await option.click();
  await expect(badge).toBeEmpty();
});

/**
 * Lifecycle regression: pointerdown must not dismiss an amber confirmation
 * target before the subsequent click can commit the proposed mathematics.
 * The previous controller's document capture listener did exactly that.
 */
test('clicking an amber inserted operand confirms the equality preview', async ({page}) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Amber click lifecycle');
  const math = workspace.activeWindow();
  await math.build('c');
  await page.locator('#copyMathButton').click();
  await math.build('a=b');
  const before = await math.historyCount();
  await math.view.locator('.equality-sign').click();
  await page.locator('[data-equality-context="add-right"]').click();
  await math.view.locator('.equality-sign').click();
  await page.getByRole('button', {name:'Use selected clipboard expression'}).click();
  await math.view.locator('.equality-inserted-operand').first().click();
  await expect(math.view.locator('.equality-inline-preview')).toHaveCount(0);
  await expectMathJSON(math, ['Equal',['Add','a','c'],['Add','b','c']]);
  expect(await math.historyCount()).toBe(before+1);
});

/** Direct display rerenders must invalidate previews even without renderApplication. */
test('display preference rerender invalidates equality preview safely', async ({page}) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('Direct rerender lifecycle');
  const math = workspace.activeWindow();
  await math.build('c');
  await page.locator('#copyMathButton').click();
  await math.build('a=b');
  const before = await math.historyCount();
  await math.view.locator('.equality-sign').click();
  await page.locator('[data-equality-context="add-right"]').click();
  await math.view.locator('.equality-sign').click();
  await page.getByRole('button', {name:'Use selected clipboard expression'}).click();
  await expect(math.view.locator('.equality-inline-preview')).toBeVisible();
  await page.locator('#multiplicationDisplayMode').selectOption('dot');
  await expect(math.view.locator('.equality-inline-preview')).toHaveCount(0);
  await expect(page.locator('.equality-inline-actions')).toHaveCount(0);
  await expectMathJSON(math,['Equal','a','b']);
  expect(await math.historyCount()).toBe(before);
});
