# Three end-to-end transformation walkthroughs — source audit (628 baseline)

**Purpose:** A practical debugging map for a new developer. These are traces of current source contracts, not browser recordings or promises that all possible entry points are equivalent. See [architecture](ARCHITECTURE_CURRENT.md) and [handover](HANDOVER_CURRENT.md).

## 1. Immediate operand rearrangement

**Student action:** drag an operand to an eligible destination. Gesture processing and drop arbitration live in `js/input/` and `js/interaction/`, coordinated by `js/app.js`. Eligibility is a mathematical rule, not merely the drop-zone geometry.

**Source trace:** `getRearrangementCandidate()` (`js/app.js`) constructs `rearrangementActionRequest(...)` and calls `rearrangementCoordinator.propose(state.expressionRoot, action)` → `js/steps/transformationCoordinator.js` dispatches to a registered rule and returns a detached result → `commitRearrangementCandidate()` (`js/app.js`) uses the immediate `createTransformationCommitLifecycle()` gate and `transformationSourceStamp()` → `prepareAtomicTransformationCommit()` stages result and history → `publishPreparedTransformation()` publishes coherent in-memory state → history/UI rendering and best-effort persistence follow.

**Contract:** no modal preview is required for immediate rearrangement, but active modal ownership blocks conflicting manipulation. Never mutate the live tree on hover; a stale source stamp must not commit. Preserve occurrence IDs where the rule allows. **Debug from:** input arbitration → `getRearrangementCandidate()` → `commitRearrangementCandidate()` → atomic commit/publication. Tests: search `tests/` and `e2e/` for rearrangement and drag coverage.

## 2. Factorisation proposal, confirmation and cancellation

**Student action:** select matching factors and request extraction. `enterFactorisationPreview()` (`js/app.js`) builds `factorPlan()`, `factorisationActionRequest(plan)` and `factorisationCoordinator.propose(...)`. `factorisationPreviewHost.open({ candidate, stamp: transformationSourceStamp() })` acquires the modal lease.

**Presentation:** the host's `show()` callback creates a detached candidate equation element, publishes the layout-affecting toolbar, then calls `transformationPreview.show()` for candidate and provenance arrows. This is a temporary visual proposal, not a committed AST/history change.

**Confirmation:** `commitFactorisationPreview()` calls `factorisationPreviewHost.confirm(currentStamp, callback)`; the callback recomputes `getFactorisationPlan(...)`, checks teaching policy and direction/IDs, prepares the atomic transformation/history and publishes it. Presentation cleanup follows the host terminal path. **Cancellation:** `cancelFactorisationPreview()` delegates to the host; its `clear()` callback restores the original presentation and removes provenance/controls, releasing modal ownership.

**Contract:** neither temporary arrows nor candidate DOM authorises a commit. A stale or mathematically ineligible candidate must fail closed. **Debug from:** `enterFactorisationPreview()` → host `open()` → `transformationPreview.show()` → `commitFactorisationPreview()` / `cancelFactorisationPreview()`. Tests: factorisation provenance lifecycle and preview cleanup contracts.

## 3. Switch mathematical objects during a preview

**Student action:** activate another object, or create a new one. Workspace navigation event handling reaches `switchObject(id)` or `changeObject(operation)` in `js/app.js`. Preview outside-click handling must not consume explicit navigation commands.

**Source trace:** `switchObject()` calls `cancelWorkspaceInteraction()` **before** `workspace.controller.activateObject(id)`. The cancellation routine calls `dismissPreviewsForContextChange()` over six feature-owned dismissals; only after cleanup succeeds and `mathematicalInteractionGate.isBlocked()` is false does it clear drag/selection state. `loadActiveObject()` then detaches the new working state and rerenders the active mathematical object via `renderApplication(false)` / `renderEquation()` and the equation presentation mount.

**Contract:** navigation must not replace the source under a live proposal or bypass its lease. A cleanup failure blocks navigation; no preview should reappear when returning to the previous object. The empty-object path still publishes through the same semantic DOM boundary. **Debug from:** outside-pointer handler / navigation command → `cancelWorkspaceInteraction()` → dismissal inventory → `switchObject()` → `loadActiveObject()` → mount. Tests: `e2e/view/preview-context-switch.spec.js`, `e2e/rules/grouping/preview-lease.spec.js`.

## Shared publication and debugging checklist

`renderEquation()` owns preview rerender policy and detached AST-to-DOM creation; `mountEquationPresentation()` owns semantic invalidation, DOM replacement, indexing, toolbar updates before overlays, and animation. For missing hitboxes, inspect semantic refresh ordering. For shifted overlays, inspect layout publication before measurement. For phantom previews, inspect feature cleanup and host lease. For unexpected history changes, inspect source stamps, rule eligibility and atomic publication—not CSS.

**Evidence:** Node suite and documentation-link checker can run locally. The user reported the full browser suite passing on the preceding Equality Escape Propagation Boundary release; no new browser run is claimed for this documentation-only change.
