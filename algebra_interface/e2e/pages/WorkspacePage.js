import { expect } from '@playwright/test';
import { MathematicalWindow } from './MathematicalWindow.js';

/** User-facing workspace operations; no dependence on page layout or AST IDs. */
export class WorkspacePage {
  constructor(page) { this.page = page; }
  async createDocument(name = 'E2E test document') {
    this.page.once('dialog', dialog => dialog.accept(name));
    await this.page.locator('#workspaceNew').click();
    await expect(this.page.locator('#workspaceEditor')).toBeVisible();
  }
  activeWindow() {
    // v2 tests use a semantic window boundary. Future multi-window support can
    // add windowForObject(id) without changing gesture helpers.
    return new MathematicalWindow(this.page, this.page.getByTestId('mathematical-window'));
  }
}
