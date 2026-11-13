# Historical record — superseded, not current

This document preserves chronological engineering notes verbatim. Its historical “current”, “pending”, and test-count statements are not release instructions. Read [ARCHITECTURE_CURRENT.md](../Superseded_2026-11-12/ARCHITECTURE_CURRENT.md) and [HANDOVER_CURRENT.md](../Superseded_2026-11-12/HANDOVER_CURRENT.md) first.

---

# Current verified baseline — 2026-11-11

- **Source baseline:** Equality Escape Propagation Boundary (628 Node tests). The user reports the **full Playwright suite passed** on this release; this is user-run verification, not a browser run in this environment.
- **Production behaviour:** Equality and negation Escape handlers consume a handled preview-cancellation keypress so the same event does not fall through to the application selection fallback. Workspace navigation is allowed through outside-preview dismissal and reaches its existing context-change gate. Grouping publishes layout-affecting actions before measuring the overlay.
- **Scope of this increment:** Source-level architectural boundary review and authoritative-documentation reconciliation only. **No production code or test changes.** See [boundary review](../Superseded_2026-11-12/ARCHITECTURAL_BOUNDARY_REVIEW_628.md).
- **Reading rule:** Historical sections below describe their own increments. Their old 'current', 'pending' and test-count statements are **not** the current release status.

## Historical architecture and increment record

# Manipulator — current architecture (2026-11-10)

**Verification:** latest user-confirmed Playwright baseline is Renderer Presentation Boundary (610 Node tests). Distribution-arrow extraction passes 613/613 local Node tests; its Playwright run is pending. Earlier chronological status statements below are historical and must not be treated as current verification.

**Presentation boundary:** `js/app.js` coordinates rerender lifecycle; `js/rendering/domRenderer.js` converts AST to semantic DOM; `js/ui/distributionArrows.js` paints inert SVG curves over the rendered distribution preview. Arrow painting is safe to repeat after geometry changes and does not own modal state, rules or hitboxes. Semantic targets are refreshed only after DOM replacement.

## Philosophy and invariants

The app is an offline educational AST manipulator. Preserve mathematical correctness, meaningful visual feedback, stable occurrence identities, source-stamped atomic commits and history. Mathematical eligibility belongs to rules, not pointer geometry. Input and presentation must remain extensible to noncommutative structures, vectors and matrices.

## Current responsibility map

| Area | Current implementation | Remaining work |
| --- | --- | --- |
| AST/rules/history | Mathematical engine, operation modules, atomic commit lifecycle | Preserve tested semantics and node IDs |
| Renderer | `js/rendering/domRenderer.js` | Remove remaining feature-specific presentation coupling |
| Semantic targets/input | `semanticTargetResolver.js`, `js/input/` | Migrate remaining legacy gesture routes |
| Drag lifecycle | `ordinaryDragController.js`, grouped `state/source/presentation/policy/lifecycle` ports | Reduce callback wiring in `app.js` |
| Drop decisions | Ordinary drag classification, eligibility and arbitration modules | Simplify effectful completion paths without duplicating validation |
| Deliberate modal previews | `js/interaction/previewSessionHost.js` for negation, identity, distribution, grouping, factorisation and equality | Audit cross-family locking and cleanup outcomes |
| Immediate transforms | Source-stamped commit gates for rearrangement and numeric combination | Respect modal ownership; do not force through Preview Host |
| Modal interaction lock | `mathematicalInteractionGate.js` backed by `modalPreviewOwnership.js` | Audit toolbar, selection and workspace entry points |
| Composition/UI | `js/app.js` | Still substantial orchestration; simplify by responsibility, not line count |

## Preview semantics

The shared host coordinates modal ownership, source validation, confirmation/cancellation and cleanup. A mathematical commit may succeed even when presentation cleanup fails; callers must not treat such an outcome as an uncommitted transformation. Feature-specific preview visuals and mathematical rules remain separate. Immediate transformations are valid without a confirmation modal but must not start during another preview.

## Current increment

Selection entry points for touch, Ctrl/Cmd range selection, multi-select toolbar and nested/root occurrence click consult the shared modal gate. Clipboard capture, history revision selection and equality symmetry now do as well. See [PREVIEW_TOOLBAR_HISTORY_GATE_593.md](PREVIEW_TOOLBAR_HISTORY_GATE_593.md). This is a targeted safety improvement, **not** a claim that every interaction route has been migrated.

## Next verification

Run Playwright for selection while grouping, factorisation, equality, negation and distribution previews are open. Verify preview-specific confirmation/cancellation still works and outside-click cancellation does not initiate another action. Then audit remaining toolbar/workspace commands and simplify redundant guards when coverage supports it.

## Context-edit modal gate (2026-11-10)

Applying and clearing numerical substitutions and restoring a history snapshot now consult the existing view-local mathematical interaction gate at their mutation boundary. Editing an uncommitted variable-input draft remains permitted. Expression rebuilding and workspace/object switching are not yet covered by this rule: those context transitions need explicit cancellation/invalidation audits rather than automatic blocking. See [PREVIEW_CONTEXT_EDIT_GATE_593.md](PREVIEW_CONTEXT_EDIT_GATE_593.md).


### History navigation during previews (2026-11-10)
Selecting a valid history revision is deliberate context navigation, not a competing mathematical manipulation. `restoreHistoryNode()` first dismisses feature-owned previews (negation, equality, identity, grouping, factorisation, distribution), checks the shared modal gate is released, and only then replaces the committed AST and revision. The history-tree handler does not preemptively block this action. Invalid revision IDs leave the preview intact. The existing `e2e/preview-dismissal.spec.js` keyboard-history regression must pass in Playwright; Node tests alone do not verify browser behaviour.

## Context-change preview dismissal (2026-11-10)

`app.js` now uses `dismissPreviewsForContextChange()` as a shared boundary before history restoration, expression replacement, mathematical-object switching, document switching/closing/deletion, and object edits. It cancels all six deliberate preview families and checks the view-local modal gate before the source changes. Parsing occurs before dismissal, so invalid expression input does not discard a preview. This is a deliberate context-change policy, not permission for competing mathematical manipulation. Existing feature-specific cancellation functions still own their visuals; the common routine only coordinates them. Navigation aborts when a lease cannot be released.

Browser verification is **pending** for this increment. Two Playwright scenarios were added to `e2e/preview-dismissal.spec.js` for expression replacement and object switching. Node tests passed (593/593). Known follow-up: review asynchronous document creation/import and navigation rollback if a context transition is rejected, and verify all six preview families through browser interaction.

### Asynchronous workspace navigation (2026-11-10)

Document activation now returns success/failure and checks preview dismissal before mutating workspace/save coordination. Creation, duplication and import honour rejected activation; import validates before dismissing a preview and rechecks after asynchronous persistence. See `WORKSPACE_ASYNC_CONTEXT_AUDIT.md`. Browser verification remains pending.


## 2026-11-10 — Pending-save snapshot acknowledgement (599 Node tests)

The workspace save coordinator serialises writes and only clears dirty state when the persisted document snapshot is still the current in-memory snapshot. A successful write of an obsolete snapshot now reports that newer edits remain unsaved rather than displaying a misleading saved confirmation. Two deterministic Node regression tests cover an edit during an in-flight save and ordered persistence of a newer queued snapshot. Node suite: 599/599 passed; documentation links: 410/410. Browser verification of this increment is pending. This does not introduce a new revision counter or guarantee durability if the browser itself loses storage.

## Current working-state isolation boundary (604 Node tests)

The document controller publishes replacement snapshots and the persistence coordinator compares document identities. When `app.js` loads an object, it must not alias the published object's mutable history or substitutions into the editing state. `js/core/objectWorkingState.js` now detaches the AST, history and substitutions before editing; it preserves mathematical node IDs. This fixes a concrete history/substitution alias previously present in `loadActiveObject()`. The browser suite has not yet been run for this increment. See [WORKING_STATE_ISOLATION_604.md](WORKING_STATE_ISOLATION_604.md).


## 2026-11-10 — History snapshot isolation (607 Node tests)

History capture and restoration now share `js/core/historySnapshotBoundary.js`, detaching AST and nested substitutions without changing stable node IDs. Node 607/607 and documentation links 411/411 passed; Playwright remains pending for this increment. See `HISTORY_SNAPSHOT_ISOLATION_607.md`.

## History consumer ownership (610-test audit)

History nodes and snapshots are authoritative records owned by the history/editor subsystem. History display is read-only. Replay and event-only export/hydration return independent values. Editable restoration uses `detachHistorySnapshot()` for both the AST and nested substitutions. `findHistoryState()` still returns a live history node, so external consumers must not mutate it. Three new contract tests protect the established read/export/restore boundaries; no production code changed in this increment. See [HISTORY_SNAPSHOT_CONSUMER_AUDIT_610.md](HISTORY_SNAPSHOT_CONSUMER_AUDIT_610.md).


### 2026-11-10: Context-dismissal call-site consolidation (610 tests)

History restoration and expression replacement now rely on `dismissPreviewsForContextChange()` for modal preview cancellation. Their redundant direct factorisation/distribution cancellation calls were removed. Non-modal drag cancellation remains local. No mathematical rules or preview-host contracts changed. Node suite: 610/610 passed; documentation links: 410 checked. Browser verification of this increment is pending. The previous context-dismissal version passed user-run Playwright.

## Keyboard/grouping geometry failure investigation (pending browser verification)

The 625-test browser geometry assertions were revised after user-reported failures: keyboard baseline now follows initial focus; grouping compares equation-relative operand positions while independently checking viewport overlay containment. This is a **test measurement correction**, not a verified production fix. Node tests pass; browser rerun is required. See [failure review](KEYBOARD_GROUPING_GEOMETRY_FAILURE_REVIEW_625.md).

## Presentation lifecycle ownership review (2026-11-11)

A successful grouping browser rerun confirmed that showing layout-affecting preview actions *before* fixed-overlay measurement is required. `app.js` coordinates the transition, `updateGroupToolbar()` publishes flow layout, and `groupingPreview` alone measures and paints the fixed overlay. The ordinary equation mount independently enforces the same toolbar-before-overlay ordering. Avoid a new general lifecycle abstraction until another independently demonstrated case requires it. A new browser regression covers scroll alignment during an open grouping preview; browser verification pending for that new case only.

## Preview family lifecycle audit (2026-11-11)

Source review of all six preview adapters confirms shared modal ownership with deliberately feature-specific presentation lifecycles. Grouping requires toolbar publication before overlay measurement; other families have different visual and cleanup contracts. No production abstraction or refactor is justified by this audit alone. See [six-family lifecycle audit](PREVIEW_FAMILY_LIFECYCLE_AUDIT_625.md). The previous lifecycle release passed the full Playwright suite according to the user; no new browser run was performed for this documentation-only audit.

## Identity/factorisation preview geometry contract (2026-11-11)

Identity's absolutely positioned candidate follows the equation panel and is not a grouping-style viewport snapshot. Factorisation updates the toolbar before candidate DOM replacement and measures provenance arrows after insertion. The common Preview Session Host owns modal lifecycle, not these distinct geometry strategies. No production refactor is justified by the source audit; a focused identity browser regression was added. See [identity/factorisation ordering audit](IDENTITY_FACTORISATION_PRESENTATION_ORDER_625.md).

Identity overlay geometry follow-up: see [containing-block regression](IDENTITY_OVERLAY_CONTAINING_BLOCK_625.md). The prior border-box equality assertion was invalid for a bordered positioned panel; the corrected identity test passed in the user-reported full browser suite.

## Factorisation provenance regression (2026-11-11)

The identity containing-block correction passed the user-reported full browser suite. Added `e2e/factorisation-provenance-lifecycle.spec.js` to that verified baseline, checking temporary SVG provenance arrows, unchanged AST/history, and cancellation cleanup. No production change. Browser verification of this new case is pending. See [factorisation provenance lifecycle](FACTORISATION_PROVENANCE_LIFECYCLE_625.md).

## Preview cleanup failure contract (628-test increment)

The shared `previewSessionHost.js` owns single-use candidate state and modal lease release, including when presentation callbacks throw. `modalPreviewOwnership.js` only manages view-local lease identity; feature adapters retain visual cleanup. Three additional Node tests protect post-show failure, failing explicit cancellation, and disposed-view rejection. No production refactor was necessary. See [cleanup failure contract](PREVIEW_CLEANUP_FAILURE_CONTRACT_628.md).

## Identity/factorisation context-switch ownership (2026-11-11)

The user reported the 628-test preview cleanup release passed its full browser suite. Source audit confirms object switching must dismiss previews before replacing the active mathematical source; feature adapters own visual cleanup, while the shared host owns modal leases. Added two Playwright regressions for identity and factorisation object switches and lease reacquisition; **new browser cases are pending verification**. No production code changed. See [context-switch ownership audit](PREVIEW_CONTEXT_SWITCH_OWNERSHIP_628.md).

## Escape versus context-change ownership (2026-11-11)

The six feature cancellation adapters are shared by context navigation, which attempts **all** preview dismissals and checks the modal gate before replacing mathematical context. Escape is an interaction-priority operation, not an all-preview context change. Its dispatch is currently split across the application window handler, a negation document handler, and an equality-controller capture handler. The overlap is a characterization target, not a reason to move leases or keyboard policy into the mathematical engine. See [Escape dismissal boundary audit](ESCAPE_DISMISSAL_BOUNDARY_AUDIT_628.md).


### Equality Escape menu-state regression (2026-11-11; browser pending)
The equality menu sign toggles `aria-expanded`; cancelling an inline equality preview does not guarantee the menu is closed. `e2e/equality-escape-reacquire.spec.js` now checks menu state before clicking to reopen it. The reported failure was an incorrect test assumption, not proof of a preview lease defect. No production code was changed. Browser verification is pending. Separately, equality Escape event propagation still warrants a dedicated single-action check; do not treat it as verified by this regression.


## Equality Escape propagation increment (pending browser verification)

The document-capture equality Escape handler now consumes an Escape only while its proposal is active, preventing the same keypress from reaching the window-level fallback. Existing equality preview cancellation and modal lease ownership remain unchanged. Browser coverage in `e2e/equality-escape-reacquire.spec.js` tests both consumption during preview and normal propagation afterward. See [Equality Escape propagation boundary](EQUALITY_ESCAPE_PROPAGATION_628.md).
