import { expect } from '@playwright/test';
import { beginPointerDrag, movePointerTo } from '../support/pointerGestures.js';

/** Identity toolbar uses custom pointer events, not native HTML drag/drop. */
export class IdentityToolbar {
  constructor(page) { this.page = page; this.root = page.getByTestId('identity-toolbar'); }
  tool(operation) { return this.root.locator(`[data-identity-operation="${operation}"]`); }
  async start(operation, target) {
    const { targetBox } = await beginPointerDrag(this.page, this.tool(operation), target);
    // Distinguishes failed pointerdown from an invalid target/hover.
    await expect(this.page.locator('.identity-drag-ghost')).toBeVisible();
    return targetBox;
  }
  async hover(targetBox, side = 'right') { await movePointerTo(this.page, targetBox, side); }
  async drop() { await this.page.mouse.up(); }
  async confirm() { await this.page.getByRole('button', { name: 'Confirm identity' }).click(); }
  async cancel() { await this.page.getByTestId('identity-preview-actions').getByRole('button', { name: 'Cancel' }).click(); }
}
