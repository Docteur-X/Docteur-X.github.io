# Equality Function Application v1.2 — Inline Preview

## Purpose and educational contract

A student applying a clipboard expression to both sides of equality should see the existing equation remain visually identifiable, with **only the two inserted clipboard occurrences** highlighted amber. The proposal appears in the existing mathematical viewport, not a separate dialog. This matches the deliberate, non-committing preview vocabulary of identity insertion and distribution.

## Architecture and data flow

1. The equality relation's operation menu arms an operation independently of the mathematical AST.
2. The clipboard gesture adapter identifies the intended relation-level operation; the pure mathematical engine (`js/relations/equalityFunctionApplication.js`) creates a candidate AST and provenance.
3. `openEqualityApplication` renders that candidate as **transient DOM** in `#equation`. The authoritative `state.expressionRoot`, object history and clipboard remain untouched.
4. The original DOM children are retained by reference, not recreated. Cancel restores those exact nodes and removes the inline controls. This matters for equality-menu listeners, stable hitboxes and interaction state.
5. Only the two fresh operand roots from the engine result receive `.equality-inserted-operand`. The structural Add/Multiply wrappers are new AST nodes but must not be amber, because they encompass existing mathematical content.
6. Confirm checks document identity, object identity, history cursor and the original expression fingerprint, then commits the engine-produced AST exactly once through the existing history pipeline.

The renderer remains responsible for mathematical precedence and brackets; the preview does not concatenate strings. No new mathematical rule, type assumption, domain policy, or equality semantics are introduced.

## Interaction

- Select an operation from the equality's floating menu and use or drag a clipboard expression onto its relation-level target.
- The candidate replaces the visible equation temporarily, within the original viewport. The new clipboard occurrences are amber and clickable for confirmation.
- A compact Confirm/Cancel row is outside the mathematical hitbox, immediately below the viewport.
- Cancel, Escape, or a click away restores the original DOM and does not create history.
- Confirm commits one transformation. An obsolete preview is rejected before committing.

## Tests and verification

- `node --test tests/*.test.js`: 214 passing in the implementation environment.
- Browser test `e2e/equality-function-application.spec.js` updated to expect inline preview, and extended to assert that only two inserted operand roots are marked, that the AST remains unchanged before commit, and that cancellation leaves history untouched.
- **Browser tests must be run on the user's machine**. Expected count: 23 (22 previous + one new).
- Suggested commands: `npm test`, `npm run test:e2e`. A separate real-device check remains useful for touch gestures.

## Known limitations and follow-up

- The preview renders a candidate DOM in the same viewport, but does not yet animate the copied operand into place as identity insertion does. This is intentional: visual animation is a later polish task, not a mathematical prerequisite.
- Existing operation eligibility remains scalar-only; future matrices require ordered multiplication and shape validation. Future arbitrary functions require explicit bound variables and domain assumptions.
- Equality preview is a single active-view operation. Future multiple-window support should preserve the principle that the mathematical object, not a window, owns the authoritative state.
- History cursor persistence under highly parallel browser tests has shown an intermittent failure in an unrelated test; sequential browser runs passed. Do not describe this as conclusively resolved.

## Long-term project commitments

Keep mathematical ASTs and proof/implication semantics separate from gesture interpretation, view/window layout, annotations and worksheet persistence. Preserve stable occurrence identities and source provenance. Future work includes multiple views per mathematical object, movable/snapping windows, mathematical annotations, compound logical statements, inequalities, vectors/matrices, and mathematically justified cross-object substitution. These goals should guide architecture, not be implemented prematurely.
