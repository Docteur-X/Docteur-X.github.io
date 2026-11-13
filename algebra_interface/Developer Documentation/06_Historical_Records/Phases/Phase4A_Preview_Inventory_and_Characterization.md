# Phase 4A — Source-grounded preview inventory and characterization

**Date:** 2026-11-07. **Baseline:** Phase 3E (owner-reported 60/60 browser tests; 365 Node tests). **Scope:** tests and documentation only; no production modifications.

## Ownership map (observed in `js/app.js`)

| Family | Entry / state | Gate | Presentation | Confirmation / cancellation | Notes |
| --- | --- | --- | --- | --- | --- |
| Distribution | `openDistributionPreview`, `state.distributionPreview` | `distributionCommitLifecycle` | `renderDistributionCurves` plus distribution copy markup | `commitDistributionPreview` / `cancelDistributionPreview` | Amber copies and provenance arrows are feature-owned. |
| Factorisation | `enterFactorisationPreview`, `state.factorisationMode` | `factorisationCommitLifecycle` | `factorisationOverlay`, `transformationPreview` | `commitFactorisationPreview` / `cancelFactorisationPreview` | Extraction geometry and explanatory preview remain specialized. |
| Grouping | `enterRangeGroupingPreview`, `state.groupingMode` | `groupingCommitLifecycle` | `groupingOverlay` | grouping confirm / `cancelRangeGroupingPreview` | Selection is not a mathematical commit; deliberate preview is. |
| Negation expansion | `openNegationPreview` | `negationCommitLifecycle` | `negationPreviewUI` | `confirmNegationPreview` / `cancelNegationPreview` | Keyboard and click activate same discrete command. |
| Identity | identity tool drop, `identityPreviewModal` | `identityCommitLifecycle` | `identityVisual`, identity action buttons | `confirmIdentityTool` / `cancelIdentityTool` | +0 / ×1 insertion uses a modal preview. |
| Equality application | `openEqualityApplication` | `equalityCommitLifecycle` | `equalityUI` | equality confirm / `cancelEqualityApplication` | Separate relation-specific UI; negation/equality reciprocal guards added in Phase 3D-4. |
| Rearrangement | active ordinary drag; settled destination | `rearrangementCommitLifecycle` at publication | `rearrangementPreview` | release/commit or cancel drag | Non-modal animated geometry; requested target is not necessarily settled target. |
| Numeric combination | ordinary drag release | `numericCombinationCommitLifecycle` | hover/drag feedback | immediate validated commit | No modal confirmation should be imposed. |

**Authority:** mathematical rules and detached candidates remain in the coordinators; each commit lifecycle consumes a proposal before calling its existing atomic publication callback. The lifecycle does not itself write history.

## Compatibility matrix — source-evidenced, not a browser-certified global policy

Legend: **G** = explicit opening guard seen in source; **U** = not established as universally excluded by a single shared owner; **N/A** = non-modal. A `G` does not prove every event sequence is covered. The matrix is deliberately conservative; do not infer universal exclusivity from a local condition.

| Attempted preview / already active | Distribution | Factorisation | Grouping | Negation | Identity | Equality |
| --- | --- | --- | --- | --- | --- | --- |
| Distribution | local lifecycle | U | U | U | U | U |
| Factorisation | G | local lifecycle | G | U | U | U |
| Grouping | G | G (arbitration) | local lifecycle | U | U | U |
| Negation | G | G | G | local lifecycle | G | G |
| Identity | G | G | G | U | local lifecycle | U |
| Equality | G | U | U | G | U | local lifecycle |

This is a **review map**, not proof that every `U` pair can actually open concurrently. For each `U` pair, Phase 4B should first characterize both directions in the live browser before deciding whether exclusivity is necessary. No claim is made that all matrix entries were empirically exercised.

## Existing lifecycle guarantees and new tests

`js/manipulator/transformationCommitLifecycle.js` owns single-use pending proposals per instance. `open` rejects overwrites; `cancel` is idempotent; `confirm` consumes before calling the publication callback; stale document/object/revision/root/fingerprint is rejected. **Separate instances can each be open**, so the lifecycle is not a cross-family modal coordinator.

New Node file `tests/phase4a-preview-lifecycle-characterization.test.js` tests these six contracts, including the intentionally non-exclusive two-instance behaviour. New Playwright file `e2e/phase4a-preview-characterization.spec.js` characterizes Escape cancellation and reopening for grouping and negation with unchanged AST and history. These browser tests require owner execution; do not mark them passed until reported.

## Explicit gaps / Phase 4B input

- Bidirectional browser attempts for each unresolved modal pair, especially identity/equality, factorisation/equality, grouping/identity and distribution/equality.
- Outside-click, object switching, rerender, focus restoration, stale callback and double-confirm integration traces across each family.
- Repeated opening during async animation and delayed callbacks for non-modal rearrangement.
- Verify exact-once history publication for each modal family via real UI; Node lifecycle tests prove only the gate, not caller wiring.
- Source comments, status and handover must be kept aligned with observed tests, not aspirational policy.

**Phase 4A gate:** Node suite 371/371 passed locally. New browser tests pending owner verification; existing Phase 3E browser suite reported passing. Do not start Phase 4B production changes until browser characterization is reviewed. Preserve specialized educational visuals and mathematical authority.

## Phase 4A browser characterization correction (2026-11-07)

The first Chromium run reported **61 passed, 1 failed**. The grouping test timed out when attempting to reuse the preview-opening button after two Escape presses. Source inspection confirms that Escape first cancels `groupingMode === "preview"`, while a subsequent Escape may call `resetRangeSelection()` when multi-selection remains. Thus the old test incorrectly assumed the grouping selection and its toolbar control must survive both presses.

The test now checks unchanged AST/history and hidden confirmation after each Escape, then explicitly reselects adjacent operands before opening another preview. This distinguishes **modal preview cancellation** from **feature-owned selection cleanup**, which a Phase 4B shared preview owner must not conflate. The correction changes no production code. The corrected browser suite is **pending rerun**; the 61/62 result belongs to the earlier test version.

## Verification update — 7 November 2026

The project owner reports the corrected Phase 4A browser suite **62/62 passed**. This supersedes the earlier 61/62 failure and the pending-rerun text above (preserved as the chronology of the test correction). The corrected test reselects adjacent operands after two Escape presses before requesting a fresh grouping preview. Production code remains unchanged. The remaining reciprocal preview-conflict and exactly-once publication gaps are still open.
