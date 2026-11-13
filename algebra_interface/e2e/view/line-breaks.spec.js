/**
 * Line breaks (D14, 14 November 2026): a long equation wraps only between
 * top-level terms, and never leaves an operator at the end of a line; each
 * operator moves to the next line with the term after it (row chunks).
 */
import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage.js';

for (const width of [700, 420]) {
  test(`a long equation at ${width} px breaks only before an operator`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const workspace = new WorkspacePage(page);
    await workspace.createDocument('Line breaks');
    const math = workspace.activeWindow();
    await math.build(String.raw`3x+-2y+4\sin(x)+-5z+7+8w=2(x+-y+z)+-1+6v`);
    const report = await math.view.evaluate(view => {
      const lines = new Set();
      const broken = [];
      for (const operator of view.querySelectorAll('.equation-side > .drag-container > .row-chunk > .plus')) {
        const term = operator.nextElementSibling;
        const a = operator.getBoundingClientRect(), b = term.getBoundingClientRect();
        lines.add(Math.round(b.top));
        // Same line: the operator and its term overlap vertically.
        if (a.bottom <= b.top || b.bottom <= a.top) broken.push(term.textContent);
      }
      return { lines: lines.size, broken };
    });
    expect(report.lines, 'the equation is long enough to wrap').toBeGreaterThan(1);
    expect(report.broken).toEqual([]);
  });
}
