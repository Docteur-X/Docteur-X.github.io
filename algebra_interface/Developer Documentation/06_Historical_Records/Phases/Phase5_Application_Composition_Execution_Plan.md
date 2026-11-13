> **Final Phase 5F checkpoint (8 November 2026):** 5A–5F work complete at source/Node acceptance level; Phase 5E browser 77/77 owner-confirmed; Phase 5F package browser rerun pending. See `Phase5F_Final_Architecture_Acceptance.md` and authoritative `Current_Status.md`. All earlier milestone statuses below are historical.

> **Phase 5D-4 checkpoint (8 November 2026):** Integration-only acceptance increment. Three new Node contract tests for view isolation, fail-fast semantic refresh, and independent layout roots; production JavaScript unchanged. Browser suite pending (77 expected). See `Developer Documentation/02_Architecture/Phase5D4_View_Integration_Acceptance.md`. The owner confirmed 77/77 browser tests for Phase 5D-3. Historical status below may be superseded.

> **Phase 5D-3 execution update (8 November 2026):** A narrow post-mount semantic refresh adapter was extracted, with four Node tests and no changes to source invalidation, feature previews, mathematical commits, or history. Node 413/413 passed; browser 77 pending. Phase 5D-4 remains the integration hardening/audit gate. See `Phase5D3_Equation_Semantic_Refresh_Extraction.md`.

> **Update (8 November 2026):** Phase 5D-1 completed and browser-verified (409 Node / 74 browser). Phase 5D-2 characterization added with three browser tests pending (77 total), production unchanged. See `Phase5D2_Rerender_Transition_Characterization.md`. Historical planning status below is superseded.

# Phase 5 — Application composition and dependency-boundary execution plan

**Status:** Phases 5A and 5B completed; 5C–5F not implemented. **Baseline:** Phase 1–4 targeted retrospective verification, owner-reported 74/74 Playwright passing, 387/387 Node previously passed. This planning update changes documentation only. Date: 8 November 2026.

## Purpose and non-goals

Reduce unrelated reasons to modify `js/app.js`, make ownership and lifecycle boundaries discoverable, and enforce lightweight architectural dependency rules. **Do not optimize for line count.** Do not rewrite the mathematical engine, create a universal gesture or preview controller, change AST identities, introduce a second commit authority, or implement Window Manager/view slots. No new mathematical gesture or teaching-policy feature belongs in Phase 5.

The project's invariant remains: students choose mathematical strategy; the AST/rule engine determines mathematical validity; feature-specific presentation explains it; source stamps and single-use atomic publication protect history. Preserve keyboard, touch, accessibility, offline use, and all existing modal/non-modal distinctions.

## Source-grounded starting point

The current `js/app.js` imports workspace/document management, rendering and semantic targeting, selection and hit-testing, feature-specific intent adapters, visual feedback, modal ownership, previews, transformation preparation/commit, and UI bindings. Some responsibilities are already extracted, notably `js/composition/transformationFeatureAssembly.js`, `js/ui/domBindings.js`, `js/ui/workspaceNavigation.js`, `js/ui/presentationPreferences.js`, `js/interaction/equalityInteractionController.js`, and `js/interaction/clipboardPanelController.js`. Reuse these seams before adding new ones. **This inventory is a starting hypothesis, not permission to extract every import.** Trace all call sites, mutable closures, event listeners, DOM ownership, and cancellation paths in 5A.

The cross-phase retrospective identified remaining integration evidence gaps: live cross-family preview conflicts, exceptional presentation cleanup, direct semantic DOM lookup, and ownership across rerender/object switches. Two focused browser tests were added in the targeted retrospective; the project owner reports all 74 browser tests passing. This is not exhaustive fault-injection coverage.

## Increment plan and exit gates

### 5A — Responsibility and dependency characterization (no production changes)

1. Produce a **function-to-responsibility map** of `app.js`: bootstrap/composition, document switching, persistence/autosave, equation rendering, input routing, transformation preparation, preview open/cancel/confirm, publication, status/feedback, and cleanup.
2. For each candidate seam, record its imports, callers, state read/written, event listeners, DOM nodes, view/object identity, synchronous/async behavior, cleanup and error paths, and exact tests.
3. Build a dependency direction diagram; classify source of truth vs derived/transient state; record circular imports and unexpected cross-layer dependencies.
4. Establish baseline metrics: module count, `app.js` lines and imports, test runtime and existing failure/flake patterns. Metrics are diagnostic, not targets.
5. **Gate:** a reviewed extraction shortlist with concrete ownership and rollback risks; 387 Node and 74 browser tests are the owner-reported/previous baseline, not newly executed by writing this plan.

### 5B — Lightweight architectural guardrails (tests/tooling first)

1. Define dependency direction: core mathematics and rules do not import DOM/UI; interaction adapters do not publish history; semantic resolver reads renderer metadata without becoming mathematical authority; composition root wires dependencies.
2. Prefer small Node dependency-boundary checks already compatible with the offline repository. Evaluate ESLint only if the project toolchain supports it without disruption. Avoid a broad formatting/lint churn.
3. Characterize ownership/lifecycle with tests before extracting functions. Protect import/export, history branching, stale proposal rejection, modal cleanup and stable IDs.
4. **Gate:** clear documented allowed/forbidden dependencies and tests that detect representative violations; no false-positive wall of warnings.

### 5C — Workspace/document coordination (conditional extraction)

1. Inspect document creation/import/switching, object switching, autosave scheduling, history restoration and rendering callbacks.
2. Extract only if the boundary can receive explicit dependencies and return controlled state transitions without holding duplicate mathematical or document state.
3. Keep repository, serialization, history and publication semantics unchanged. Preserve save timing and user-visible statuses.
4. **Gate:** focused Node/integration tests plus complete browser suite; exactly the same active object, restored cursor, saved document and preview cancellation behavior.

### 5D — View-level orchestration (conditional, one seam at a time)

1. Prefer cohesive lifecycle coordinators for rerender invalidation and modal-preview cleanup over generic event-bus or global manager designs.
2. Do not move rule validation into UI modules or put feature-specific educational DOM in a generic renderer.
3. Preserve view-scoped feedback/semantic targets/gesture sessions/modal leases and explicit cleanup on rebuild, history restoration, document/object switch, errors and teardown.
4. **Gate:** no stale references, leaked leases, duplicate commits, changed focus/keyboard/touch behavior or layout shifts. Verify one extraction at a time.

### 5E — Composition-root simplification and dependency review

**Implementation decision (8 November 2026):** Completed as source-grounded review and living-documentation cleanup, without production extraction. The existing central rerender sequence has meaningful ordering and would not become simpler by moving it into a forwarding-only module. See `Phase5E_Composition_Simplification_Decision.md`. Browser verification pending.

1. Make `app.js` read primarily as dependency assembly, event binding and high-level coordination. Preserve local glue when extraction would increase indirection.
2. Re-audit direct DOM queries, feedback class mutations and duplicated source stamps. Consolidate only demonstrably competing responsibilities.
3. Confirm no import cycles, missing imports or new mutable global singletons; record before/after module ownership map and explicit reasons for retained code.
4. **Gate:** full Node/Playwright parity and an understandable end-to-end flow from occurrence -> gesture -> rule -> preview -> publication.

### 5F — Final acceptance, documentation and handover

1. Re-run full regression suites and selected browser workflows: nested selection, distribution, factorisation, grouping, equality, identity, negation, touch/keyboard, rerender, object switch, history import/reload.
2. Audit exactly-once publication, exceptional cleanup, cross-view isolation contracts and dependency rules. Keep unverified future multi-view support explicitly marked as future.
3. Update existing `START_HERE_FOR_NEXT_CHAT.md`, `AI_Handover.md`, `Current_Status.md` and master plan; do not create another competing current handover.
4. **Gate:** evidence that a new feature requires fewer unrelated `app.js` edits; no behaviour regressions; architecture and rollback instructions clear. Then proceed to Phase 6 design readiness.

## Per-increment discipline

- Before: trace actual source, state transitions, cancellation, existing tests and alternatives. Record a concise decision and rollback point.
- During: small coherent diff; explanatory comments for invariants, not noise; no unrelated mathematical feature changes.
- After: Node suite, focused Playwright, full Playwright, static dependency checks, visual/keyboard/touch verification where applicable. Never infer browser passes from Node tests.
- If regression: stop, inspect traces and source, fix root cause rather than weakening assertions or adding sleeps.
- Update authoritative handover with exact changed files, verification provenance, unresolved risks and next step.

## Architectural decisions to retain

- Keep Visual Feedback Controller decorative; interactive affordances are future interaction-layer work, justified by concrete features.
- Keep semantic DOM resolution distinct from physical hit testing and AST authority.
- Keep intent arbitration advisory and commit lifecycle authoritative.
- Keep six modal preview families feature-owned for their mathematical explanation, with view-local lease exclusivity.
- Keep non-modal rearrangement animation separate from modal preview ownership.
- Keep default distribution gesture on the addition operator; bracket targeting is only a possible future teaching-policy experiment.
- Keep test-quality consolidation as a separate later milestone; do not remove regression tests merely to shrink the suite.

## Historical planning questions for 5A (resolved during Phase 5)

Which responsibilities genuinely form stable components? Which mutable closure variables require explicit ownership? Where are there lifecycle reentrancy or exception boundaries? Would extraction improve readability at call sites, or merely move complexity? Which dependencies are essential versus accidental? Decide from the current code and tests, not from a preselected module-count goal.
