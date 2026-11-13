# Architectural boundary review — 628-test baseline

Date: 2026-11-11. Source examined from the Equality Escape Propagation Boundary release. This is an audit, **not** a new production refactor.

## Purpose and stopping rule

Manipulator is an offline educational AST manipulator, not an automatic solver. Keep mathematical validity in rules, occurrence IDs stable when possible, preview proposals uncommitted, and interactions understandable to students. Simplify only when a demonstrable bypass, duplicated responsibility, or violated contract exists. Do not measure success by the length of `app.js`.

## Source-verified responsibility map

| Boundary | Owner | Contract / observation |
| --- | --- | --- |
| Mathematical representation and rules | `js/core/`, transformation modules | Mathematical validity and occurrence identity must not depend on DOM geometry. |
| AST to semantic DOM | `js/view/rendering/domRenderer.js` | Builds semantic hitboxes; does not own modal leases. |
| Equation publication | `js/view/equationPresentationMount.js` | Invalidates old targets, publishes replacement DOM, refreshes semantic index, then updates dependent presentation. |
| Application orchestration | `js/app.js` | `renderEquation()` coordinates rerender policy; `dismissPreviewsForContextChange()` coordinates cancellation before source replacement. These are deliberately different policies. |
| Preview ownership | `js/steps/previewSessionHost.js` and feature adapters | Shared lease/commit lifecycle; each family owns its own visual cleanup. |
| Grouping overlay | `js/interaction/groupingPreview.js` and grouping presentation host | Layout-affecting toolbar must be published before fixed overlay geometry is measured. |
| Input event handling | Feature keyboard handlers and application fallback | Handled preview Escape is consumed; later Escape can reach ordinary selection fallback. Explicit workspace navigation must not be swallowed by outside-preview dismissal. |
| Working-state and history boundaries | `js/documents/objectWorkingState.js`, `js/documents/historySnapshotBoundary.js` | Editable working snapshots are detached from committed document/history snapshots. |

## Review decisions

1. **Retain** the equation publication mount: its sequencing is a meaningful boundary, not redundant indirection.
2. **Retain** feature-specific preview visuals: identity, equality, grouping, factorisation, distribution and negation have different geometry and teardown needs. The shared host already owns their common lease contract.
3. **Retain** separate context-change and presentation-rerender cancellation policies. Distribution's rerender preservation is deliberate.
4. **Do not introduce** a universal Escape controller on current evidence. The two documented event propagation defects were fixed locally and the user reports the full suite passes.
5. **Reconcile documentation:** prior authoritative files accumulated incompatible top-of-file status declarations. The current baseline now appears once at the beginning; older increment narratives are explicitly historical.

## Remaining risks / follow-up

- This is a source review, not a proof that every possible input path respects the modal gate. New features should test their own mutation and navigation entry points.
- Browser-only layout, focus and pointer behavior must continue to be checked in Playwright; Node tests alone cannot validate them.
- A future structural simplification should start with a concrete dependency or bypass and an acceptance test, not a file-size target.

## Verification

Run `node scripts/run-node-tests.mjs`, `node scripts/check-documentation-links.mjs`, and `npx playwright test`. The user reported the full Playwright suite passing on the source baseline before this documentation-only increment. Do not claim a fresh browser run for this audit.
