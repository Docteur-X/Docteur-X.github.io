# Semantic insertion boundary — migration increment

Status: implemented in the ordinary pointer rearrangement pathway; browser verification pending.

## Purpose

A rearrangement destination is a *boundary between operands*, not an AST occurrence. A boundary carries the associative parent node ID and a zero-based destination index in the operand sequence **after removal of the source operand**. It does not carry a DOM element, pointer coordinate, or permission to apply a mathematical rule.

## Source of truth

`js/input/insertionBoundary.js` exports `insertionBoundary` and `resolveDragInsertionBoundary`. The latter checks that the current AST still contains an Add/Multiply parent, that the source is a direct child, and that the proposed index is in range. It rejects unrelated geometry target kinds. It does **not** decide commutativity or transformation eligibility.

`js/app.js` now resolves the boundary at three points in ordinary dragging: hover candidate construction, final-drop arbiter validation, and final-drop candidate construction. Each path still invokes the existing `getRearrangementCandidate` mathematical rule gate. No AST is mutated during hovering. Existing source-stamp and commit protections remain in place.

## Test evidence

- `node scripts/run-node-tests.mjs`: 469/469 passing (2026-11-10).
- `node scripts/check-documentation-links.mjs`: 406/406 passing.
- Browser/Playwright tests for **this increment**: not run in the container; user verification required.
- Prior archive Playwright suite: user reported all passing, before this increment.

## Scope and limitations

This is an incremental migration, not a complete semantic drag-input system. The old geometry/hit-testing implementation, hover visuals, drag session and event handlers still exist. Other drag kinds (combine, distribution, negation compression, factorisation, identity) are not yet converted to the semantic input contract. Existing immediate rearrangement commit behaviour is unchanged; it is not a modal confirm/cancel preview.

## Recommended next steps

1. User runs Playwright and reports results.
2. Add a typed semantic drag session (source occurrence, view/object identity, source revision, render generation) and bridge geometry into semantic hover/release events.
3. Move gesture recognition and intent arbitration out of `app.js`, retaining the mathematical engine as final authority.
4. Migrate drag features individually, removing superseded handlers after browser verification.
5. Reconcile architectural documentation with the actual implementation; retire superseded material only after preserving important decisions.

## Architectural cautions

Stable AST IDs do not imply stable DOM elements. Reject stale render indices and stale source revisions. A parent/index address must be revalidated against the current AST at commit. Future matrix cell insertion, equation-wide gestures and non-associative expression layouts may require different address kinds; do not overload this one.
