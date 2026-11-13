# Pointer rearrangement: behavioural regression and completion boundary

Status: implemented, Node-verified 2026-11-10; browser verification pending for this increment.

## Change

The old `rearrangement-commit.test.js` and the last test in `rearrangement-architecture.test.js` inspected substrings of `app.js` to infer whether pointer rearrangement used `renderApplication(false)`. Such tests could fail after a harmless refactor, or pass despite incorrect runtime sequencing.

`js/interaction/ordinaryDragRearrangementExit.js` now owns the pointer-specific completion sequence. It calls the supplied mathematical commit, clears the drag, and invokes `render(false)` to suppress a second FLIP animation. The application remains responsible for live candidate revalidation, status messages, mathematical history, and preview arbitration. The callback boundary deliberately avoids a second state store.

`tests/rearrangement-commit.test.js` now checks the actual ordering and the render argument for successful and rejected candidates, and validates missing callback handling. The existing mathematical rearrangement tests continue to check mathematical eligibility and stable node IDs.

## Verification

- Node test runner: 520 passed, 0 failed.
- Documentation links: 406 checked, all valid.
- Playwright: user verified previous 519-test version; **not yet verified** for this increment.

## Limitations / follow-up

- These unit tests verify the render policy at the extracted boundary, not real browser animation timing. Keep the existing Playwright rearrangement scenarios and consider adding a direct no-post-drop-motion browser assertion.
- `finishDrag()` still owns substantial rule-specific orchestration. Next, consolidate its dependency interfaces and reduce repeated candidate resolution while retaining independent commit-time validation.
- Preserve the existing authoritative AST/history, preview exclusivity, source revision checks, and stable node identities.
