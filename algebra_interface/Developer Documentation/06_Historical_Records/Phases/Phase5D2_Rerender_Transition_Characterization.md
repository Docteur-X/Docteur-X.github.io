## Phase 5D-2 targeted hardening — 8 November 2026

The project owner confirmed 77/77 Playwright tests passing on the original Phase 5D-2 build. The subsequent source audit found that `loadActiveObject()` bypassed semantic-target and structure-navigation refresh when switching to an empty Mathematical Object. This was a concrete ownership inconsistency: detached equation DOM did not guarantee that the navigator's in-memory entries had been cleared.

**Production correction:** the empty-object branch now updates the view's document/object identity attributes and explicitly refreshes `semanticTargetResolver`, `rendererInspector`, and `structureNavigator` after clearing equation DOM. The populated-object render sequence remains unchanged.

**Browser characterization strengthened:** the existing empty-object test now asserts that the navigator reports no mathematical occurrence and disables semantic selection/navigation. The distribution test now rebuilds a fresh distributable expression and opens a new distribution preview after invalidation, demonstrating lease reacquisition rather than mere disappearance of old DOM. The existing rapid-history test is unchanged.

**Verification:** 409/409 Node tests passed locally and `node --check js/app.js` passed. The revised browser suite remains **77 tests, pending owner verification**. Do not claim browser acceptance of this hardened build until rerun. No mathematical rule, AST, history, or commit infrastructure changed.

**Next:** run the focused two revised Playwright tests and the full 77-test suite, then make the conditional Phase 5D-3 extraction decision. Do not extract the central rerender sequence wholesale.

# Phase 5D-2 — Rerender transition characterization and ownership contract

Date: 2026-11-08. Baseline: Phase 5D-1, 409 Node tests and 74 browser tests passed (browser result reported by project owner).

## Scope and decision

**Characterization only.** No production JavaScript, mathematical rules, history or rendering implementation is changed. Phase 5D-2 is an evidence gate for the conditional Phase 5D-3 extraction. Do not extract `renderEquation()` wholesale.

## Render transition ownership contract

1. **Source invalidation — application/view coordination.** Operations that replace the mathematical source (build, restore history, switch object/document) must cancel incompatible gestures, feature-owned proposals, and leases before installing the new source. A view-only rerender is different from a source replacement. Cancellation may be idempotently checked again by `renderEquation()`.
2. **Mount and semantic rebinding — rendering infrastructure.** Capture old geometry if requested; render detached AST DOM; mount with `replaceChildren`; only then refresh semantic target resolver, inspector, structure navigator and equality controls. Detached DOM must not be treated as an active target.
3. **Feature-owned presentation — feature controllers.** Update group and factorisation toolbars before measuring selection overlays; reconstruct distribution curves after mounting; apply FLIP animation last. Resizing and scrolling may refresh geometry without changing the AST.
4. **Explicit preservation exception — distribution.** A display-only rerender while `distributionPreview` is active preserves its amber candidate. A source-changing rerender must cancel the proposal and release its modal lease. This is not a generic permission for arbitrary previews to survive rerenders.
5. **Empty Mathematical Objects.** The current `loadActiveObject()` empty-root branch clears equation and panels directly rather than calling the normal semantic refresh pipeline. Browser characterization must establish whether it leaves any stale targets or interactive state. Do not assume the full-render contract applies to that branch.
6. **Asynchronous effects.** FLIP callbacks are view-only and may clear inline styles; they must never publish mathematics. Rapid history navigation must leave the last selected history branch authoritative. Any future DOM reuse requires explicit animation-generation review.

## Callers and transition classification

| Entry point | Transition | Preview ownership rule |
| --- | --- | --- |
| `renderEquation(animate)` | View mount/rebind | Cancels negation/equality/identity/grouping/factorisation; distribution may be preserved intentionally |
| `renderApplication(animateEquation)` | Full derived view refresh | Calls renderEquation, then variables/history/MathJSON/equality truth |
| `loadActiveObject()` | Mathematical Object source switch | Cancels previews; nonempty root uses renderApplication; empty root clears DOM directly |
| `restoreHistoryNode(nodeId)` | Mathematical source/history change | Explicitly cancels drags and distribution/factorisation; resets selection, then renders |
| Expression build | Mathematical source replacement | Must cancel source-bound proposals and leases before render |
| Multiplication display change | Presentation-only rerender | No mathematical history publication; distribution preview can survive |
| Resize / scroll listeners | Geometry refresh | Update overlays and curves without rebuilding the AST |

## New browser characterization

`e2e/phase5d2-rerender-transitions.spec.js` adds three tests:

- Populated → empty → populated Mathematical Object: old hitboxes disappear; restored source and history are intact.
- Distribution preview through display-style rerender versus source-changing rebuild: preview preserved only for view-only rerender; no premature commit.
- Rapid navigation across sibling history branches: last branch remains current and visible, no obsolete modal preview appears.

These are **new, pending browser verification**. If any fail, diagnose whether the test assumes an unsupported behaviour or the implementation violates the intended contract. Do not weaken an assertion without recording why.

## Phase 5D-3 decision gate

Extract only a cohesive, view-local responsibility supported by this evidence. Preserve application-owned source invalidation and feature-specific presentation. If the empty-root branch needs correction, address the concrete bug separately before extraction. Do not introduce a universal preview manager, renderer-owned mathematical commit, or arbitrary interaction-affordance framework.

## Verification and handover

Production JavaScript unchanged. Node suite remains at 409 tests; run it and the 77-test browser suite before accepting this increment. Update the authoritative `AI_Handover.md` and `Current_Status.md` after the owner's browser result.
