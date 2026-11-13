# Phase 5E — Composition-root simplification and dependency review

**Status:** source review and documentation consolidation complete; Node and browser verification recorded separately in Current_Status.md. **Baseline:** Phase 5D-4, 416/416 Node tests and 77/77 browser tests (browser result reported by project owner).

## Decision: no further production extraction in 5E

The 5A responsibility inventory and the 5D rerender ownership audit establish that `app.js` is a composition root, not a mathematical rule module. Phase 5C extracted workspace save scheduling and status generation; Phase 5D extracted view-local FLIP layout transitions and post-mount semantic refresh. Those are coherent independently testable responsibilities. Remaining central rendering operations have meaningful order dependencies and feature-specific cancellation responsibilities. A new coordinator that merely forwards callbacks would increase indirection without reducing ownership ambiguity. Thus Phase 5E is a **review, acceptance and documentation simplification**, not a line-count-driven rewrite.

## Current dependency and ownership map

| Responsibility | Owner | Boundary to preserve |
| --- | --- | --- |
| Active document, object, dirty state, orchestration | `js/app.js` | Never delegate mathematical authority to rendering |
| Save debounce, serialized writes, stale status suppression | `js/workspace/workspaceSaveCoordinator.js` | Inject callbacks; no dependency on `app.js` |
| Equation DOM creation | `js/rendering/domRenderer.js` | DOM is derived from AST, not a second mathematical model |
| View-local FLIP geometry | `js/ui/equationLayoutTransition.js` | No history, AST or modal state |
| Post-mount semantic consumer refresh | `js/ui/equationSemanticRefresh.js` | Stamp identity, resolver, inspector, navigator; fail fast |
| Semantic occurrence lookup | `js/rendering/semanticTargetResolver.js` | Not pointer geometry or mathematical validity |
| Transient feedback | `js/interaction/visualFeedbackController.js` | Decoration only, not action wiring |
| Gesture intent selection | `js/interaction/intentArbitration.js` and adapters | Advisory; rule engine decides eligibility |
| Modal exclusivity | `js/interaction/modalPreviewOwnership.js` | Lease only; no DOM cleanup or publication |
| Proposal confirmation and history publication | `js/manipulator/` lifecycle/publication modules | Single-use, source-state validation |
| Feature previews and overlays | Existing feature-specific controllers and `app.js` coordination | Preserve mathematical teaching explanations |

## Source-level review and retained decisions

1. **DOM lookups:** direct queries are appropriate for feature-specific hit testing, toolbars, and overlays. Do not replace them wholesale with semantic occurrence resolution, which answers a different question.
2. **Feedback CSS:** not every direct class manipulation competes with the Visual Feedback Controller. Drag ghosts, animations, preview copies and feature-specific highlights have distinct owners. Only consolidate a demonstrated collision.
3. **Source stamps:** long-lived drag sessions and discrete operator activation have different freshness needs. Do not remove commit-time source validation or duplicate it inside modal leases.
4. **Rerender ordering:** source invalidation precedes DOM replacement; semantic refresh follows replacement; toolbar updates precede overlay geometry. Distribution can preserve its preview across display-only rerenders, not source-changing rebuilds.
5. **Composition root:** it is legitimate for `app.js` to coordinate feature-specific callbacks. Avoid a universal gesture manager, generic preview renderer or new mutable global singleton.
6. **Dependency rules:** run the hardened Phase 5B checker and Node tests on each extraction. Static checks do not prove dynamic behaviour or every import syntax.

## Known limits carried into Phase 5F

- Delayed FLIP cleanup callbacks are not generation-invalidated; no demonstrated element-reuse bug.
- Rendering or semantic refresh failure can leave partial presentation; fail-fast prevents consumers from using a stale resolver, but does not roll back the DOM.
- Pure owner-conflict contract tests do not prove every real-browser feature pair; retain legacy guards with independent non-modal responsibilities.
- Multiple live views are not implemented; current view-local component tests are only preparation for Phase 6.
- The strengthened second-distribution-drag test had repeated failures before a later passing run; keep the eligibility assertion and watch for flakiness rather than adding arbitrary sleeps.
- The test suite's quality consolidation remains a separate later milestone; do not remove useful regression tests to meet a numerical target.

## Phase 5F acceptance gate

Run the full Node suite, dependency checks and full browser suite; audit import cycles, missing imports, modal lifecycle and exactly-once publication; compare actual source responsibilities against this map. Update the one authoritative handover and status, and retain the last browser-verified ZIP for rollback. Only change production code for a reproduced defect or a proven reduction in coupling.
