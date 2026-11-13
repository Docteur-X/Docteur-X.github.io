# Escape and context-dismissal boundary audit — 628-test baseline

Date: 2026-11-11. Source-reviewed against `js/app.js` and `js/interaction/equalityInteractionController.js`. No production changes in this increment.

## Verified current baseline

The user reports that the full Playwright suite passed on the Preview Creation & Navigation Fix (628 tests). The 628 Node test count is inherited from that release; see the latest local verification in the handover. This review itself does not claim a fresh browser run.

## Ownership map

- **Context changes:** `dismissPreviewsForContextChange()` iterates the six `previewDismissals` adapters, attempts cleanup even after individual errors, and refuses navigation if cleanup failed or the mathematical interaction gate remains blocked. It is deliberately **all-preview** cleanup.
- **Escape:** `window` keydown in `app.js` uses an explicit priority chain: identity, factorisation, factor drag, grouping, ordinary drag, distribution, multi-selection. This is deliberately **one-interaction** cleanup, not equivalent to context navigation.
- **Negation:** a separate document keydown handler cancels negation on Escape; negation is absent from the window priority chain. Consequently a single Escape may also reach the window chain and clear another active non-modal interaction if one exists. This is a *potential* one-key/two-actions defect, not a confirmed reproduced bug.
- **Equality:** `equalityInteractionController.js` has a capture-phase document Escape listener that cancels an active equality preview; equality is also absent from the window priority chain. The same multi-listener concern applies, subject to reachable states and the modal gate.
- **Outside pointerdown:** feature-specific click-away cancellation is intentionally different from Escape and context navigation. Explicit object/document creation and switching must reach their context-change handlers, as established by the latest browser-verified fix.

## Architectural assessment

The shared Preview Session Host owns leases and stale-safe proposals, not global keyboard dispatch. It would be incorrect to move all Escape behavior into the host or make context navigation cancel only the first active interaction. The potential overlap is **input dispatch**, not mathematical or preview ownership.

Before refactoring, write a browser characterization of one Escape when negation/equality preview is active alongside a retained non-modal selection (where reachable). Verify exactly one intended interaction is dismissed, AST/history remain unchanged, and the next Escape performs the next available cancellation. If the overlap is reproduced, route Escape through one view-local priority dispatcher while keeping feature cancellation adapters and the context-change all-preview gate unchanged. Do not introduce a second preview-state registry.

## Not established

No evidence here proves that two independently active modal previews can coexist; the interaction gate is designed to prevent that. No change to the production Escape chain is justified solely by static inspection.
