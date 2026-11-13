import { expect } from '@playwright/test';

/** Scope all node lookups to one Mathematical Window, never the whole page. */
export class MathematicalWindow {
  constructor(page, root) { this.page = page; this.root = root; }
  get view() { return this.root.getByTestId('mathematical-view'); }
  operand(index = 0) { return this.view.locator('.add-operand').nth(index); }
  node(id) { return this.view.locator(`[data-node-id="${id}"]`); }
  async build(expression) {
    await this.page.locator('#expressionInput').fill(expression);
    await this.page.locator('#expressionForm button[type="submit"]').click();
    await expect(this.view.locator('[data-node-id]').first()).toBeVisible();
    // The maths fonts are fetched when maths is first drawn; measure only after
    // they have arrived, or a later font swap looks like a layout shift.
    await this.page.evaluate(() => document.fonts.ready);
  }
  /**
   * The minus sign the student sees for a negated term: its own minus, or,
   * in a sum written a − b, the boxed − in the operator position that stands
   * for it (the term's own minus is hidden there).
   */
  minusSign() {
    return this.view.locator(':is(.plus[data-stands-for-minus], .negate-operator-hitbox:not([data-leading-sign]))').first();
  }
  async astText() { return this.page.locator('#mathJsonOutput').textContent(); }
  async historyCount() { return Number(await this.page.locator('#historyCount').textContent()); }
}
