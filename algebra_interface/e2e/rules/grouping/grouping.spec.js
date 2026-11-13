import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage.js';
import { multiSelect, expectOneCommit, expectMathJSON } from '../../support/mathAssertions.js';

test('adjacent addends: blue envelope, bracket preview, confirm', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument();
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  const before = await math.astText();
  const count = await math.historyCount();
  await multiSelect(page, [math.operand(0), math.operand(1)]);
  await expect(page.getByRole('button', { name: 'Preview grouping of selected adjacent operands' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Preview grouping of selected adjacent operands' }).first().click();
  await expect(page.getByRole('button', { name: 'Confirm grouping', exact: true })).toBeVisible();
  expect(await math.astText()).toBe(before);
  await page.getByRole('button', { name: 'Confirm grouping', exact: true }).click();
  await expectOneCommit(math, before, count);
  // The public MathJSON-like view serialises an explicit group as a nested Add.
  // Assert the actual operand structure, not an internal AST node-type token.
  await expectMathJSON(math, ['Add', ['Add', 'a', 'b'], 'c']);
  // The mathematical grouping must also remain visible to the student.
  await expect(math.view.locator('.expression-bracket--explicit')).toHaveCount(2);
});
