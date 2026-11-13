/**
 * Phase 5D-2: browser characterization of view transitions, not a new renderer.
 * These tests use public UI controls and inspect mathematical state separately
 * from DOM presentation. Do not add sleeps to conceal asynchronous defects.
 */
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { WorkspacePage } from '../pages/WorkspacePage.js';
import { beginPointerDrag, movePointerTo } from '../support/pointerGestures.js';
import { deserializeCompactDocument } from '../../js/documents/documentSerialization.js';
import { toMathJSON } from '../../js/engine/mathJson.js';

const fixtureURL = new URL('../fixtures/multi-object-branching.json', import.meta.url);

test('5D-2: populated to empty to populated object does not reuse old equation targets', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('5D-2 empty object transition');
  const math = workspace.activeWindow();
  await math.build('a+b+c');
  const before = await math.astText();
  const history = await math.historyCount();
  const oldId = await math.operand(0).getAttribute('data-node-id');
  await math.operand(0).click();
  page.once('dialog', dialog => dialog.accept('Empty object'));
  await page.getByRole('button', { name: 'New object' }).click();
  await expect(math.view.locator('[data-node-id]')).toHaveCount(0);
  await expect(math.view.locator(`[data-node-id="${oldId}"]`)).toHaveCount(0);
  // An empty object must also invalidate the navigator's *model*, not just
  // detach the old equation DOM. No stale occurrence may be selectable.
  const navigator = page.getByRole('region', { name: 'Mathematical structure navigation' });
  await expect(navigator.getByText('No mathematical occurrence')).toBeVisible();
  await expect(navigator.getByRole('button', { name: 'Select occurrence' })).toBeDisabled();
  await expect(navigator.getByRole('button', { name: 'First child' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Confirm grouping', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Object 1' }).click();
  await expect.poll(() => math.astText()).toBe(before);
  await expect(math.view.locator(`[data-node-id="${oldId}"]`).first()).toBeVisible();
  expect(await math.historyCount()).toBe(history);
});

test('5D-2: distribution-owned display rerender preserves proposal; rebuilding invalidates it', async ({ page }) => {
  await page.goto('/');
  const workspace = new WorkspacePage(page);
  await workspace.createDocument('5D-2 distribution rerender');
  const math = workspace.activeWindow();
  await math.build('a*(b+c)');
  const before = await math.astText();
  const history = await math.historyCount();
  const { targetBox } = await beginPointerDrag(page,
    math.view.locator('.factor-slot').first(), math.view.locator('.plus').first());
  await movePointerTo(page, targetBox);
  await expect(math.view.locator('.plus--distribution-drop')).toBeVisible();
  await page.mouse.up();
  await expect(math.view.locator('.distribution-preview__copy').first()).toBeVisible();
  // Display style rerenders the existing AST; it must not silently commit.
  await page.locator('#multiplicationDisplayMode').selectOption('dot');
  await expect(math.view.locator('.distribution-preview__copy').first()).toBeVisible();
  expect(await math.astText()).toBe(before);
  expect(await math.historyCount()).toBe(history);
  // A source-changing rebuild must cancel the old candidate and release lease.
  await math.build('x+y');
  await expect(math.view.locator('.distribution-preview__copy')).toHaveCount(0);
  await expect.poll(async () => JSON.parse(await math.astText())).toEqual(['Add', 'x', 'y']);
  // Verify reacquisition, not merely disappearance of the old preview.
  await math.build('a*(b+c)');
  const { targetBox: newTarget } = await beginPointerDrag(page,
    math.view.locator('.factor-slot').first(), math.view.locator('.plus').first());
  await movePointerTo(page, newTarget);
  // Diagnose target eligibility before releasing the pointer. If this fails,
  // investigate gesture recognition and target/session state, not modal leasing.
  // Mirror the first drag without adding sleeps or automatic retries.
  await expect(math.view.locator('.plus--distribution-drop')).toBeVisible();
  await page.mouse.up();
  // If eligibility passes but preview creation fails, inspect arbitration/lease.
  await expect(math.view.locator('.distribution-preview__copy').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(math.view.locator('.distribution-preview__copy')).toHaveCount(0);
});

test('5D-2: rapid sibling history navigation leaves the final branch visible and current', async ({ page }) => {
  const fixture = JSON.parse(await readFile(fixtureURL, 'utf8'));
  const document = fixture.document;
  const object = document.objects[document.activeObjectId];
  const hydrated = deserializeCompactDocument(fixture);
  const snapshots = new Map(hydrated.objects[document.activeObjectId].history.nodes
    .map(node => [node.id, node.snapshot]));
  const branches = object.history.nodes.filter(node => node.parentId !== null);
  expect(branches).toHaveLength(2);
  await page.goto('/');
  await page.locator('#workspaceImport').setInputFiles({
    name: 'multi-object-branching.json', mimeType: 'application/json',
    buffer: await readFile(fixtureURL)
  });
  await expect(page.locator('#workspaceStatus')).toContainText('Imported');
  const math = new WorkspacePage(page).activeWindow();
  await page.locator('#historyToggle').click();
  for (const branch of [branches[0], branches[1], branches[0], branches[1]]) {
    await page.locator(`#historyTree [data-history-id="${branch.id}"]`).click();
  }
  const last = branches[1];
  await expect(page.locator(`#historyTree [data-history-id="${last.id}"]`))
    .toHaveAttribute('aria-current', 'true');
  await expect.poll(async () => JSON.parse(await math.astText()))
    .toEqual(toMathJSON(snapshots.get(last.id).expression));
  expect(await math.historyCount()).toBe(object.history.nodes.length);
  await expect(page.getByTestId('negation-preview')).toHaveCount(0);
  await expect(math.view.locator('.distribution-preview__copy')).toHaveCount(0);
});
