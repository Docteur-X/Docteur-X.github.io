/**
 * The input router runs routes in the order they are declared, so the route
 * table IS behaviour (standard 2). Stage 6 moved routes out of app.js; this
 * test proves the table (names, events, places, modes, order) is unchanged.
 * A deliberate change of route order updates e2e/view/route-order.json in the
 * same commit, with the reason in the commit message.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('the route table is unchanged (names, places, modes and order)', async ({ page }) => {
  await page.goto('/');
  const routes = await page.evaluate(() => window.manipulatorDiagnostics.routes());
  const expected = JSON.parse(readFileSync(new URL('./route-order.json', import.meta.url), 'utf8'));
  expect(routes).toEqual(expected);
});
