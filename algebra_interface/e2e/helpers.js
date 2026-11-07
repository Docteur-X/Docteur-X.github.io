// Backward-compatible convenience helpers. Prefer Page Objects in new tests.
import { WorkspacePage } from './pages/WorkspacePage.js';
import { dragPointer as pointerDrag } from './support/pointerGestures.js';
export async function createDocument(page) { await new WorkspacePage(page).createDocument(); }
export async function buildExpression(page, expression) { await new WorkspacePage(page).activeWindow().build(expression); }
export const dragPointer = pointerDrag;
