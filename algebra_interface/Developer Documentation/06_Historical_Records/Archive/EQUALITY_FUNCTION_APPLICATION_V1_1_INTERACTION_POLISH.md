# Equality Function Application v1.1 — interaction polish and handover

## Scope and motivation

The first release had a correct, tested mathematical rule but a relation menu rendered inside a clipped equation viewport. The clipboard drag had no moving visual representation, and the preview used a modal confirmation dialog. This increment changes **presentation and interaction only**, retaining the mathematical rule and existing history commit validation.

## Architectural contracts

1. **Mathematics remains authoritative.** `js/relations/equalityFunctionApplication.js` constructs candidate ASTs. The application must not mutate the committed expression while merely hovering, opening the palette, dragging, or previewing.
2. **Arming is transient.** The operation menu and its armed selection are UI state, not document or mathematical-history state. Closing the palette does not disarm the equality. Selecting the same choice again does.
3. **Palette portal.** The `.equality-operation-menu` is appended to `document.body` and positioned using the equality sign's `getBoundingClientRect()`. It flips above/below and clamps to viewport edges. It has a visually distinct slate palette, not mathematical operand hitboxes. On equation rerender the old portal is destroyed before a fresh one is attached. Tapping elsewhere dismisses the menu without changing the armed context.
4. **Clipboard drag ghost.** A pointer drag exceeding eight pixels creates a decorative, `pointer-events:none` ghost in `document.body`. It follows the pointer and is removed on release/cancel. The original clipboard entry remains intact and reusable. The existing dashed equation drop target is retained.
5. **Amber candidate preview.** The candidate renders in a nonmodal, floating preview above the equation. The renderer marks candidate nodes with IDs absent from the source AST using `.equality-new-node`. It does not replace the original equation DOM or alter hitbox geometry. Clicking the proposed result or the explicit Confirm button invokes the existing stale-revision checks and history commit; Cancel does neither. This is a first visual approximation of distribution-style inline preview, not a full FLIP transition.
6. **Subtree target priority.** Existing subtree drops are reserved for future justified substitution. Invalid subtree drops never fall back to relation application. The mathematical rule still requires explicit arming.

## Test coverage and commands

- `node --test tests/*.test.js`: 214 tests passed in the implementation environment.
- `node --check js/app.js`: passed.
- `npm run test:e2e`: browser verification **required** on the user's machine; expected 22 Playwright tests (21 inherited plus the new geometry/dismissal regression).
- Browser tests were updated to find the palette at the document level rather than within `.equality-root`, which would be incorrect after portalization.

## Known limitations / next work

- The amber candidate uses a floating, nonmodal view; it does not yet animate newly inserted terms into the exact locations of the original equation as distribution does. It deliberately preserves original DOM geometry and stable IDs.
- Positioning is viewport-clamped but has not been verified on every small screen. The preview can be taller than its target and is scrollable.
- Function application still supports only scalar addition and ordered multiplication. Division, subtraction, arbitrary functions, domain checks, inequalities, matrices, and justified substitution are not implemented.
- In future multi-relation windows, arming must be keyed by relation node ID and view, not by the current single-root equality slot.
- Maintain extensive explanatory comments, mathematical invariants, and documentation in every future change. Preserve modular gesture/engine separation, noncommutative order, independent node identities, and history provenance.
