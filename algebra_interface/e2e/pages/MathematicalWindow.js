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
  }
  async astText() { return this.page.locator('#mathJsonOutput').textContent(); }
  async historyCount() { return Number(await this.page.locator('#historyCount').textContent()); }
}
