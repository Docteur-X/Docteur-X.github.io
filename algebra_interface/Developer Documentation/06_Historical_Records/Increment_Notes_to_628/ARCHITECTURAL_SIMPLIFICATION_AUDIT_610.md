# Manipulator — architectural simplification audit

**Date:** 2026-11-10  
**Basis:** `Manipulator_History_Consumer_Audit_610.zip`, inspected source and documentation; Node tests executed locally.  
**Scope:** Architecture, direct history-node consumers, module boundaries, and documentation authority. **No production code changes in this audit.**

## Executive conclusion

The major mathematical and preview invariants are substantially better protected than in the original archive, but the application has not yet become significantly easier to comprehend as a whole. We should consolidate coherent workflows, reduce callback wiring and duplicated cancellation, and retire superseded documentation **before adding more micro-modules**. Do not pursue a line-count target in isolation.

## Measured baseline

| Metric | Original archive | Current 610-test archive |
| --- | ---: | ---: |
| `js/app.js` lines | 3,519 | 3,456 |
| Current `js/app.js` top-level/indented function declarations (approximate textual count) | not measured | 93 |
| Current `js/interaction/` JavaScript files | not measured | 43 |
| Current `js/input/` JavaScript files | not measured | 5 |
| Current `Developer Documentation/00_Current/` files | not measured | 52 |
| Markdown files in all developer documentation | not measured | 209 |
| Node tests | not re-executed | **610/610 passed** |
| Relative documentation links | not re-executed | **412/412 valid** |

The `app.js` reduction is **63 lines (~1.8%)**, not a dramatic shrinkage. Counting files or lines does not measure maintainability, but the concentration of coordination in `app.js` and 52 files under `00_Current` are clear discoverability concerns. The full archive contains 121 JS files under `js/`; counts should exclude tests, visual specs and tooling when comparing production code.

## Direct history-node access: ownership audit

- `js/core/documentHistory.js` owns `findHistoryState(history, id)` and intentionally returns a **live** history node. Its internal uses include append, replay and graph traversal. The function is a mutable-internal API, **not** a safe read-only snapshot API.
- `js/app.js` has a local `findHistoryNode()` wrapper (`~782`) that directly returns the live node. The confirmed callers are restoration (`~814`), history-tree child traversal (`~894`) and current-history lookup (`~908`). Restoration detaches the snapshot via `detachHistorySnapshot()` before assigning editable AST/substitutions; rendering reads labels and snapshots to display text.
- Other direct graph reads include history rendering (`~851–908`), document invariants/serialization, workspace ID reservation and replay. These are not inherently violations; each has a different ownership purpose.
- **No new aliasing defect was demonstrated in these read paths during this audit.** The exposure of a live node remains an architectural hazard for future callers. Do not rewrite working history logic solely because it returns a mutable object.

**Recommended small contract change when touching history next:** distinguish `findHistoryStateInternal()` (live mutable internal node) from a public read-only projection or detached reader. First identify every import and test caller; keep editor-owned mutation explicit. This is not urgent enough to justify a standalone migration now.

## High-value simplification opportunities (priority order)

### P1 — One coherent preview/context transition coordinator

`app.js` currently composes six `createPreviewSessionHost()` instances (negation, equality, identity, grouping, factorisation, distribution) and still coordinates feature-specific cancellations during context changes (`restoreHistoryNode()` calls `dismissPreviewsForContextChange()`, then additional cancellation helpers). Audit whether those subsequent cancellations are redundant and whether each host can register one explicit context-dismissal callback. **Avoid a second preview state store.** Preserve single-use confirmation, modal exclusivity, stale-source rejection and commit/cleanup distinction.

**Acceptance:** a context switch has one documented entry point; cancellation executes at most once per preview; failure to release a modal lease aborts navigation; all preview-dismissal browser tests pass.

### P2 — Cohesive drag interaction workflow

`ordinaryDragController.js` already provides a unified pickup/move/release/cancel lifecycle, but `app.js` still owns geometry setup, feature-specific completion effects and extensive callback composition. Consider moving **one complete interaction workflow** (including coherent effects) into a single cohesive feature controller, not extracting each callback into its own file. Preserve geometry-versus-mathematics separation, source stamps, render generations, stable node IDs and history semantics.

**Acceptance:** the ordinary drag pathway is understandable from the controller and its documented ports without searching unrelated sections of `app.js`; the controller does not own mathematical rules or a duplicate drag-state store; existing browser gestures and animations remain unchanged.

### P3 — Renderer/input dependency audit

The Renderer remains a large and partly feature-aware subsystem. Map its imports and options before changing it; distinguish generic visual instructions from mathematical rule calculations. Prioritize an end-to-end proof over a broad rewrite.

**Acceptance:** rendering is driven by AST plus generic presentation state; semantic target resolver remains the sole DOM-to-mathematical address boundary; no accidental new hitboxes or node-ID regeneration.

### P4 — Authoritative documentation reset

`00_Current` has **52 files**, many named for past migration increments. `ARCHITECTURE_CURRENT.md` contains chronological appendices with obsolete 'Playwright pending' claims despite later user verification; its top banner describes the 595-test state while its bottom describes the 610-test state. This is not an acceptable single source of truth.

Create a small current core: `PROJECT_PHILOSOPHY.md`, `ARCHITECTURE.md`, `CONTRACTS.md`, `FEATURE_MATRIX.md`, `TESTING.md`, `DECISIONS.md`, `STATUS.md`, `HANDOVER.md`. Keep historical reports in a clearly labelled archive during transition. **Do not delete old docs until consequential design decisions and links have been migrated and validated.** Remove obsolete status claims rather than appending more.

## What not to do

- Do not rewrite exact arithmetic, AST node identity or history persistence without a demonstrated defect and characterisation tests.
- Do not force immediate rearrangement/numeric-combination operations through the modal Preview Host.
- Do not introduce a document revision counter alongside the currently working identity-based snapshot mechanism without a concrete failure mode.
- Do not measure success by fewer lines in `app.js` alone, or by adding many small wrapper modules.
- Do not delete historical rationale before extracting accepted/rejected decisions.

## Verification and next decision

Local: `node scripts/run-node-tests.mjs` **610/610 pass**; `node scripts/check-documentation-links.mjs` **412 links valid**. Browser Playwright not run in this environment for this audit. The user reported browser success for the prior 607-test version; browser status of the 610-test archive remains unconfirmed.

**Recommended first implementation slice:** P1, a focused audit and consolidation of context-dismissal/cancellation ownership across the six preview hosts. Start with a call graph and behavioural matrix, then remove redundant coordination **in the same change**. Follow with Node tests and user-run Playwright. In parallel, begin replacing the misleading chronological `ARCHITECTURE_CURRENT.md` with a concise current-state specification, while preserving historical decisions.
