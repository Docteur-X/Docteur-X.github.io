# Range grouping — Manipulator architecture migration

Status: implemented in the current release; browser verification of pointer overlays remains necessary.

## Responsibilities

- `js/manipulator/groupingGesture.js` converts a mathematically eligible adjacent-sibling selection into a frozen, DOM-independent `grouping.range` action request. It does not change the tree or decide associativity.
- `js/manipulator/transformationCoordinator.js` routes that request to the Engine's `getRangeGroupingPlan`, rechecking parent identity, operation kind, and the ordered selected IDs. A non-associative operation remains ineligible.
- `js/manipulator/groupingVisual.js` describes the selected operands, bracket style and confirmation role. The established `js/interaction/groupingPreview.js` continues drawing the non-layout-changing blue envelope and preview brackets.
- `js/manipulator/previewCoordinator.js` stores the pending candidate and history revision. Confirmation rejects stale history states; the Engine checks the selection again before applying `groupOperandRange`.
- `js/app.js` wires the existing Ctrl/Cmd selection, preview/cancel controls, modal locking and history commit. It does not contain grouping mathematics.

## Lifecycle and invariants

1. Ctrl/Cmd+click may select nonadjacent nodes, but the Engine offers grouping only for adjacent siblings under associative Add/Multiply.
2. The selection envelope is purely visual and does not move hitboxes or modify the AST.
3. Clicking the envelope or Preview creates an immutable action and enters the shared preview lifecycle. The original expression and history remain unchanged.
4. Changing bracket style during preview rebuilds the candidate so the displayed and committed styles match.
5. Cancel preserves the selection and records no history event. Confirm rechecks the current history revision and mathematical eligibility, preserves existing operand IDs, and commits one `grouping.range` history event.
6. Switching objects/documents, rebuilding expressions and resetting selection clear the pending grouping proposal.

## Extension notes

The generic action, coordinator and preview contracts are shared with identity insertion and distribution. Do not duplicate associativity tests in the gesture adapter, or reimplement blue-overlay geometry in the visual descriptor. When migrating factorisation, preserve its distinct teaching-policy restrictions and provenance overlays.

## Verification

Run `node --test tests/*.test.js`. The new `tests/grouping-architecture.test.js` checks action immutability, pure eligibility, associative restrictions, cancellation and stale revisions. Also browser-test nested grouping, whole equality-side grouping, Ctrl/Cmd selection, style changes in preview, keyboard confirmation, and switching objects while a preview is open.
