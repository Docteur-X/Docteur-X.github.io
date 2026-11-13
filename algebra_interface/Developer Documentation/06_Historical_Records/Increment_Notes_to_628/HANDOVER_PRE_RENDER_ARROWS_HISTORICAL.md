> Historical snapshot; not current verification status. Retained for traceability.

## Latest increment: renderEquation preview lifecycle characterization (2026-11-10)

The latest verified browser baseline is the user-confirmed 610-test Escape-handler version. A new Playwright characterization for negation dismissal during multiplication-display rerender was added but **has not yet run in a browser**. Node tests: 610/610; docs links: 410/410. No production code changes. See `RENDER_EQUATION_PREVIEW_AUDIT.md` for the audit, the distribution reentrancy caveat, and the next architectural decision.

# Current handover — Preview context dismissal consolidation (2026-11-10)

Latest local change: `js/app.js` now uses one ordered `previewDismissals` inventory for deliberate context changes. It delegates to existing feature-specific cleanup adapters, continues attempting cleanup after an exception, and refuses navigation if cleanup failed or modal ownership remains. This does not add a second state store or change mathematical rules.

**Local verification:** 610/610 Node tests passed; documentation links passed (413 before this document update); `node --check js/app.js` passed. **Playwright has not been run for this increment.** The user previously reported passing Playwright on the 610-test history consumer audit baseline.

**Next:** Run `npx playwright test`, especially preview dismissal via history navigation, expression replacement, object/document switching, Escape, and click-away. Then audit remaining direct preview cancellation paths and simplify only where semantics coincide. Preserve stable AST IDs, source-stamped commits, exclusive preview ownership and atomic history publication.

See `PREVIEW_CONTEXT_DISMISSAL_CONSOLIDATION.md` and `ARCHITECTURE_CURRENT.md` for details. Older migration documents are historical evidence, not competing architectural authority.


### 2026-11-10: Context-dismissal call-site consolidation (610 tests)

History restoration and expression replacement now rely on `dismissPreviewsForContextChange()` for modal preview cancellation. Their redundant direct factorisation/distribution cancellation calls were removed. Non-modal drag cancellation remains local. No mathematical rules or preview-host contracts changed. Node suite: 610/610 passed; documentation links: 410 checked. Browser verification of this increment is pending. The previous context-dismissal version passed user-run Playwright.

## Latest incremental cleanup (2026-11-10)

A redundant second factorisation-preview cancellation was removed from `loadActiveObject()`; the pre-rebinding cancellation remains necessary. See `PREVIEW_CLEANUP_SIMPLIFICATION_REVIEW.md` for the audited distinctions between context dismissal, rerender, Escape and non-modal drag cleanup. Node suite: 610/610 passed. Browser verification pending for this increment; the preceding 610-test context-callsite cleanup is the user-verified baseline.


## Latest increment: equation presentation boundary (2026-11-10)
`prepareEquationPresentationRerender()` in `js/app.js` now owns rerender-specific transient cancellation; `renderEquation()` delegates to it. Distribution is intentionally preserved. Node 610/610 passed; Playwright pending. See `RENDER_PRESENTATION_BOUNDARY_610.md`.
