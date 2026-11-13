# Phases 1–4 retrospective — initial source-level findings

**Audit date:** 8 November 2026. **Audited input:** `Manipulator_Phase4F_Living_Documentation_Consolidated.zip` (the delivered archive). **Production changes:** none. **Verification:** independently ran `node --test tests/*.test.js` — **387 passed, 0 failed**. The project owner reports **72/72 Playwright tests** on the Phase 4F build; this audit did not independently run Playwright.

## Inventory and dependency health

- `js/` contains **92 JavaScript modules** and **194 detected local import/re-export edges**. Static analysis found **zero missing local imports** and **zero local import cycles**. This is a useful structural check, not proof of runtime correctness or all dependency-boundary rules.
- `js/app.js` is **3,537 lines** and still coordinates multiple feature lifecycles. This is a candidate for Phase 5 composition work, but file length alone is not evidence of a defect.
- The AST remains the mathematical authority. The feedback registry, semantic resolver, arbiter and modal lease are presentation/interaction facilities and should never publish mathematical history.

## Phase 1 — feedback ownership

**Sound:** `js/interaction/visualFeedbackController.js` shares a WeakMap registry keyed by view root, while individual handles have independent owner namespaces. Effective classes are reconciled as a union; descriptors are validated before replacing an owner's request; `dispose()` removes its channel. Detached nodes are excluded when reconciliation runs.

**Integration boundary:** `dragFeedback.js`, `identityDragFeedback.js`, `groupingPreview.js`, `inlineExtractionVisual.js` and other features still manipulate specialized CSS classes directly. This is not automatically a violation: many are geometry, animation or feature-owned preview effects. A later audit must classify them by semantic role before migration. The registry does not autonomously observe DOM replacement; it relies on feature clear/reconciliation lifecycles. **Test gap:** adversarial cross-controller hint/class restoration through actual rerender and theme changes.

## Phase 2 — semantic targeting

**Sound:** `js/rendering/semanticTargetResolver.js` builds an AST occurrence index, scans renderer metadata once per refresh, rejects Mathematical Object mismatches and filters detached elements. `js/rendering/domRenderer.js` emits operator-boundary indices starting at **1**; resolver documentation matches this. `app.js` refreshes the resolver after replacing the equation DOM and before refreshing navigator/inspector.

**Maintainability concern:** `semanticContainerMap.js` also has `mapRenderedOccurrences()` which performs repeated DOM scans per entry; `app.js` and specialized previews retain direct `data-node-id` lookups. These may be legitimate specialized operations, but should be classified to avoid creating competing semantic-address authorities. **Test gap:** real-browser nested Group/precedence brackets and two simultaneous views of the same object; multi-view is not yet implemented.

## Phase 3 — intent arbitration

**Sound:** `js/interaction/intentArbitration.js` is pure, uses explicit owner-to-intent capability mapping, checks session/view/object identities, rejects stale or blocked sessions, and refuses genuinely ambiguous proposals. Adapters remain advisory; commit-time mathematical checks remain authoritative. No global numerical priority ranking was introduced.

**Documentation debt (confirmed):** the module header still says live dispatch remains authoritative *until Phase 3C*, and its typedef documents `settled` twice. Both comments are stale after the Phase 3C–3D integrations. **Design limit:** `eligible: true` is supplied by trusted adapters, not proven by the arbiter. Browser tests must exercise actual gesture-to-commit paths, not only synthetic proposals.

## Phase 4 — modal and non-modal lifecycles

**Sound:** `modalPreviewOwnership.js` is view-local and separate from `transformationCommitLifecycle.js`; all six modal families have lease variables in `app.js`. Drag ghosts and rearrangement animations remain non-modal. The lease registry rejects an occupied view and prevents stale lease IDs from releasing newer owners. The Phase 4F suite checks 30 directed owner-label pairs at contract level.

**Contract precision (low):** the lease documentation says release requires the exact live lease, while `matches()` compares `viewId`, `leaseId`, `owner`, and `sessionToken` but not document/object IDs. Monotonic lease IDs prevent an observed stale-release defect; either document the selected identity fields or strengthen comparison with a test.

**Integration risk (medium):** cleanup order and exception recovery differ across preview families. `commitRangeGrouping()` releases the lease before `groupingOverlay.clear()` and rerendering on success. `commitFactorisationPreview()` attempts lease release in `finally`, but earlier cleanup exceptions may skip subsequent visual operations. Mathematical publication and DOM recovery are intentionally not atomic; Phase 5 should define a consistent *best-effort view recovery* policy without rolling back a valid mathematical commit.

**Test gap (medium):** contract-level owner-label conflicts do not prove that all six real browser entry handlers reject competing previews. Deliberately failing cleanup (fault injection) and post-failure reacquisition remain unverified.

## Priorities and decisions

1. **P1 — Verification, not a confirmed production defect:** add representative real-browser cross-family conflict/reacquisition tests (e.g., negation vs equality, identity vs grouping, distribution vs factorisation) chosen by distinct entry mechanisms, not an exhaustive combinatorial suite.
2. **P1 — Verification:** inject one controlled cleanup failure and assert that the lease is released, the original error remains diagnosable and subsequent requests behave safely. Avoid claiming guaranteed restoration after arbitrary DOM failures.
3. **P2 — Lifecycle inventory:** record each family’s cancel/confirm/rebuild/history/object-switch paths and the order of proposal, DOM and lease cleanup. Fix only proven gaps.
4. **P2 — Phase 2 integration:** inspect competing direct semantic lookups and verify actual renderer metadata under nested groups and object switches. Keep geometric hit-testing separate.
5. **P3 — Documentation:** correct stale Phase 3 comments and lease matching wording in a later documentation-only change.
6. **Defer:** universal gesture/preview controllers, global styling migrations, teaching-policy options and multi-view implementation until concrete use cases and tests justify them.

## Phase 5 extraction guidance

Begin with a responsibility/call-site map of `app.js` (view lifecycle, feature composition, persistence, status, input dispatch). Extract only modules with a coherent owner, explicit dependency injection and stable source-state/cleanup contracts. Preserve feature-specific educational visuals and existing mathematical commit authority. The goal is lower coupling and safer feature additions, **not** a smaller file for its own sake.

## Evidence limits

This is a source-level retrospective plus a fresh Node run. It does not establish browser-level fault recovery, visual CSS precedence under every theme, or two simultaneous live mathematical views. Those are explicit follow-up gates before substantial Phase 5 changes.
