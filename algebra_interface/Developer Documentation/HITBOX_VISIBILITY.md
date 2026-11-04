# Hitbox visibility — presentation-only mode

**Implemented:** Always visible (default) and On hover / selection, selected from the expression controls. The preference is saved locally when browser storage is available.

## Invariants

- Hitbox DOM, border widths, padding, dimensions, node IDs, AST, drag geometry and mathematical rules are unchanged. CSS makes only ordinary outlines transparent; never use `display: none` or remove borders.
- `hitboxVisibility.js` resolves one deepest `.term[data-node-id]` from the pointer target. No ancestor/descendant is automatically marked. Selection (`.is-selected` / `.is-multi-selected`) is maintained independently and remains visible when hovering elsewhere.
- Green numeric-combination and amber transformation cues, grouping overlays, modal previews and keyboard focus remain visible. Hover decoration is suppressed during active dragging or modal previews.
- The controller clears its reference when the renderer replaces the equation DOM. Switching the mode does not record history or modify mathematics.

## Maintenance and verification

The UI wiring is in `app.js`; CSS visibility rules are at the end of `styles.css`; the pure DOM-decoration controller is `js/interaction/hitboxVisibility.js`. Tests: `tests/hitbox-visibility.test.js`. Check nested Group/Add/Multiply hover, selected ancestor with hovered descendant, Ctrl/Cmd multi-selection, dragging, green/amber previews, keyboard focus, and both themes in a real browser. Touch requires a separate tap/focus discoverability review.
