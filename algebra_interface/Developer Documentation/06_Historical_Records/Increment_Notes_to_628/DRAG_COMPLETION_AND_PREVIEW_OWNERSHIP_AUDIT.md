# Drag completion and preview ownership: source-grounded audit

Status: 2026-11-10; based on the 556-test completion-consolidation source. **Audit only: no production rewrite is authorised or implied by this document.** Browser verification of that baseline was reported by the user.

## End-to-end control flow

`ordinaryDragController.release` -> `lifecycle.finishDrag` in `app.js` -> semantic-session freshness check -> current-source and modal check -> `decideOrdinaryDragDrop` -> live eligibility adapters / intent arbiter -> `classifyOrdinaryDragCompletion` -> selection exit or `executeOrdinaryDragExit` -> existing feature-specific preview/commit/history paths. Cancellation clears temporary drag presentation only.

## Remaining app.js responsibilities (not all should move)

| Location | Dependencies and effects | Recommendation |
| --- | --- | --- |
| `finishDrag` | state.drag, semantic resolver, source stamp, source validity, arbiter, rule adapters, modal flags, selection, status | Keep as short orchestration until a complete contract exists; do not add another wrapper solely to shrink line count. |
| `executeOrdinaryDragExit: distribution` | saved distribution plan, clearDragState, openDistributionPreview | Retain revalidation inside preview open; never treat the hover plan as permission to commit. |
| `executeOrdinaryDragExit: negation-compress` | dragged ID, target ID, clearDragState, openNegationPreview | Preview owns the candidate; ensure cancelled/stale preview never commits. |
| `executeOrdinaryDragExit: combine` | live parent lookup, `canCombineDraggedSibling`, numeric commit lifecycle, render, status | Preserve independent commit-time eligibility and atomic history. |
| `executeOrdinaryDragExit: insert` | live boundary resolution, candidate, pointer rearrangement completion, history, render | Preserve boundary-after-removal semantics and no second FLIP animation. |
| `clearDragState` | ghost, feedback, state.drag, CSS | Central cleanup is useful; avoid redundant local cleanup implementations. |

## Preview ownership reality

`modalPreviewOwnership` is one view-local lease registry. Equality, negation, identity, distribution, grouping, and factorisation have separate lease variables and feature-specific candidate/UI/commit lifecycle code. Rearrangement and numeric combination use commit lifecycles without an equivalent long-lived modal preview. A common lease registry **does not yet constitute a common preview host**.

- Negation: `openNegationPreview` proposes a detached candidate, arbitrates expansion, acquires lease, opens single-use lifecycle, then presents UI. Cancellation releases the exact lease in `finally`.
- Distribution: `openDistributionPreview` computes a detached rewrite, acquires lease, opens lifecycle, then sets feature-specific preview state and renders. Cancellation clears state, cancels lifecycle, renders and releases lease in `finally`.
- Equality, identity, grouping, factorisation: each has separate acquisition/cancellation paths. Their exact ordering and failure cleanup need feature-by-feature browser tests before a common host replaces them.
- `finishDrag` blocks several modal flags; the drag pickup policy also checks the global ownership registry. Do not remove either gate until all preview paths have a verified common contract.

## Concrete risks to test before migration

1. Preview acquisition or presentation throws: no leaked lease, candidate, ghost, or stale click handler.
2. Switching document/object while a preview is open: candidate cannot confirm against the new source.
3. Rapid confirm/cancel and repeated clicks: at most one history commit.
4. Reentrant rerender during drop or preview open: no stale DOM identity or source accepted.
5. Distribution plan is computed from current AST at open and independently validated at confirm; visual highlighting is never mathematical authority.
6. Rearrangement retains node identities and does not replay the already previewed movement animation.
7. Keyboard and pointer cancellation respect exclusive preview ownership.

## Decision and recommended next code increment

Do **not** introduce a universal preview host in one pass. First write a *behavioural preview-ownership matrix* (open/confirm/cancel/source-switch/failure) for the existing features, using the real browser where possible. Then extract a narrow reusable **lease + candidate + lifecycle transaction** only where the feature contracts are demonstrably equivalent. Preserve rule-specific presentation and provenance. This is a proposal, not approved architecture.

Avoid more micro-modules for `finishDrag` until tests demonstrate a specific dependency seam. The current pure decision/eligibility functions are already separated; the remaining complexity is largely effectful coordination, which requires explicit ownership rather than further naming indirection.

## Verification evidence

Baseline: 556 Node tests and documentation-link checks reported passing in prior increment; user reported Playwright passing for the completion-consolidation archive. This audit adds no production code or test cases. Re-run Node and docs checks for the packaged archive; browser retest is not necessary solely for a documentation change.
