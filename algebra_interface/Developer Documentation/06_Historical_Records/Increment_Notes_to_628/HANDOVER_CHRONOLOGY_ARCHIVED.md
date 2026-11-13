# Historical record — superseded, not current

This document preserves chronological engineering notes verbatim. Its historical “current”, “pending”, and test-count statements are not release instructions. Read [ARCHITECTURE_CURRENT.md](../Superseded_2026-11-12/ARCHITECTURE_CURRENT.md) and [HANDOVER_CURRENT.md](../Superseded_2026-11-12/HANDOVER_CURRENT.md) first.

---

# Current verified baseline — 2026-11-11

- **Source baseline:** Equality Escape Propagation Boundary (628 Node tests). The user reports the **full Playwright suite passed** on this release; this is user-run verification, not a browser run in this environment.
- **Production behaviour:** Equality and negation Escape handlers consume a handled preview-cancellation keypress so the same event does not fall through to the application selection fallback. Workspace navigation is allowed through outside-preview dismissal and reaches its existing context-change gate. Grouping publishes layout-affecting actions before measuring the overlay.
- **Scope of this increment:** Source-level architectural boundary review and authoritative-documentation reconciliation only. **No production code or test changes.** See [boundary review](../Superseded_2026-11-12/ARCHITECTURAL_BOUNDARY_REVIEW_628.md).
- **Reading rule:** Historical sections below describe their own increments. Their old 'current', 'pending' and test-count statements are **not** the current release status.

## Historical architecture and increment record

# Manipulator — authoritative current handover

Date: 2026-11-10. This file supersedes chronological handover fragments elsewhere; historical migration documents are supporting evidence, not current implementation authority.

## Verified baseline

- **625/625 Node tests** passed locally after the grouping layout-order correction (2026-11-11).
- **Playwright**: user reported the complete suite passing after the 625-test grouping layout-order fix. This is user verification, not a browser run in the assistant environment.
- Latest production change: grouping preview toolbar is published before overlay geometry is measured. Browser verification passed (user report).

## Architectural invariants

- Mathematical AST and rules decide validity. Rendering produces semantic HTML; semantic targets must be invalidated before DOM replacement and after failed publication.
- Physical input becomes semantic events; view-local drag sessions are source-stamped and must not commit after source changes.
- Six deliberate preview families use the shared Preview Host. Immediate rearrangement and combination use separate immediate commit paths but obey the shared modal interaction gate.
- Context navigation dismisses previews safely. Presentation-only rerender dismisses DOM-bound previews while distribution is deliberately preserved and rebuilt.
- History and document working snapshots must not alias committed snapshots. Saves must not acknowledge newer unsaved edits; dirty document closing waits for successful persistence.

## Current rendering pipeline

`app.js` owns preview policy and detached AST rendering. `equationPresentationMount.js` owns the ordered DOM publication, semantic refresh, toolbar and overlay updates, and FLIP completion. `distributionArrows.js` paints decorative SVG curves. Do not move mathematical eligibility or preview leases into these modules.

## Prior review and follow-up

The caller workflow was reviewed in [Render equation workflow review](RENDER_EQUATION_WORKFLOW_REVIEW_619.md). Next, reproduce browser preview and empty-object transitions before changing ordering or merging render paths. The first candidate is consolidating the empty-object semantic publication path with the normal mount, but only if feature controls and empty-state rendering are explicitly characterised. Avoid callback forwarding or tiny abstractions. Keep the six mount regression tests and browser preview tests as acceptance criteria.

## Verification commands

`node scripts/run-node-tests.mjs`; `node scripts/check-documentation-links.mjs`; `npx playwright test` (on the user's computer if Chromium is unavailable here).

## Keyboard/grouping geometry failure investigation (pending browser verification)

The 625-test browser geometry assertions were revised after user-reported failures: keyboard baseline now follows initial focus; grouping compares equation-relative operand positions while independently checking viewport overlay containment. This is a **test measurement correction**, not a verified production fix. Node tests pass; browser rerun is required. See [failure review](KEYBOARD_GROUPING_GEOMETRY_FAILURE_REVIEW_625.md).

## Presentation lifecycle contract review (2026-11-11)

The verified grouping bug demonstrates the existing contract: layout-affecting controls must publish before fixed-position overlays measure their targets. `equationPresentationMount.js` already orders toolbars before overlays; grouping preview entry is a separate lifecycle and now follows the same rule. This is an ordering contract, not a reason to move grouping geometry into `app.js` or to add callback-forwarding layers.

Added a browser regression for scrolling while a grouping preview is open. It requires actual scroll movement and full selected-hitbox containment. Node and documentation checks are local; the new browser case passed in the user-reported full Playwright run. No production code changed in this increment.

## Preview family lifecycle audit (2026-11-11)

Source review of all six preview adapters confirms shared modal ownership with deliberately feature-specific presentation lifecycles. Grouping requires toolbar publication before overlay measurement; other families have different visual and cleanup contracts. No production abstraction or refactor is justified by this audit alone. See [six-family lifecycle audit](PREVIEW_FAMILY_LIFECYCLE_AUDIT_625.md). The previous lifecycle release passed the full Playwright suite according to the user; no new browser run was performed for this documentation-only audit.

## Identity/factorisation layout-order audit (2026-11-11)

Reviewed actual preview entry implementations and CSS. Identity uses a panel-anchored absolute candidate overlay (not a fixed viewport measurement); factorisation publishes its toolbar before swapping the candidate and schedules provenance geometry after insertion. No grouping-style production ordering defect was established, so no production refactor was made. Added `e2e/identity-presentation-layout.spec.js` (browser verification pending). See [identity/factorisation ordering audit](IDENTITY_FACTORISATION_PRESENTATION_ORDER_625.md).

Identity overlay geometry follow-up: see [containing-block regression](IDENTITY_OVERLAY_CONTAINING_BLOCK_625.md). The prior border-box equality assertion was invalid for a bordered positioned panel; the corrected identity test passed in the user-reported full browser suite.

## Factorisation provenance regression (2026-11-11)

The identity containing-block correction passed the user-reported full browser suite. Added `e2e/factorisation-provenance-lifecycle.spec.js` to that verified baseline, checking temporary SVG provenance arrows, unchanged AST/history, and cancellation cleanup. No production change. Browser verification of this new case is pending. See [factorisation provenance lifecycle](FACTORISATION_PROVENANCE_LIFECYCLE_625.md).

## Latest increment — preview cleanup failure contract (628 tests, 2026-11-11)

User reported the full browser suite passed on the factorisation provenance release (625 tests). Three new `previewSessionHost.test.js` cases protect post-show failure cleanup, explicit cancellation when visual cleanup throws, and rejecting new sessions after view disposal. Fresh local Node result: **628/628 passing**. No production changes. Browser suite for this archive passed (user report). See [cleanup failure contract](PREVIEW_CLEANUP_FAILURE_CONTRACT_628.md). Next: inspect context-switch/teardown adapters for actual host bypasses; do not add an extra generic controller without evidence.

## Identity/factorisation context-switch ownership (2026-11-11)

The user reported the 628-test preview cleanup release passed its full browser suite. Source audit confirms object switching must dismiss previews before replacing the active mathematical source; feature adapters own visual cleanup, while the shared host owns modal leases. Added two Playwright regressions for identity and factorisation object switches and lease reacquisition; **new browser cases are pending verification**. No production code changed. See [context-switch ownership audit](PREVIEW_CONTEXT_SWITCH_OWNERSHIP_628.md).


### Equality Escape menu-state regression (2026-11-11; browser pending)
The equality menu sign toggles `aria-expanded`; cancelling an inline equality preview does not guarantee the menu is closed. `e2e/equality-escape-reacquire.spec.js` now checks menu state before clicking to reopen it. The reported failure was an incorrect test assumption, not proof of a preview lease defect. No production code was changed. Browser verification is pending. Separately, equality Escape event propagation still warrants a dedicated single-action check; do not treat it as verified by this regression.


## Equality Escape propagation increment (pending browser verification)

The document-capture equality Escape handler now consumes an Escape only while its proposal is active, preventing the same keypress from reaching the window-level fallback. Existing equality preview cancellation and modal lease ownership remain unchanged. Browser coverage in `e2e/equality-escape-reacquire.spec.js` tests both consumption during preview and normal propagation afterward. See [Equality Escape propagation boundary](EQUALITY_ESCAPE_PROPAGATION_628.md).
