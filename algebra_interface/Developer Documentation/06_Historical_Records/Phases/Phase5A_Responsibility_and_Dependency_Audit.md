# Phase 5A — Application responsibility and dependency characterization

**Status:** source audit complete; no production changes. **Baseline:** Phase 1–4 targeted retrospective, owner-reported 74/74 browser tests; 387/387 Node tests independently rerun on 8 November 2026. **Next:** Phase 5B guardrails, only after the proposed seams have been reviewed.

## Purpose and methodology

This report maps the current `js/app.js` composition root to concrete responsibilities, mutable state, DOM ownership, dependency directions and extraction hazards. It is a characterization record, **not** an implementation approval for every proposed extraction. Evidence: current source, its import graph, existing tests and the Phase 5 execution plan. Browser results are owner-reported, not independently rerun in this audit.

## Baseline metrics

- `js/app.js`: **3,537 lines**, **70 import declarations** (counted by `from` clauses), **96 named function declarations**, and **69 direct `addEventListener` registration sites** (not a count of listeners active at runtime).
- `js/`: **92 JavaScript modules**; **0 missing relative imports**, **0 detected import cycles** by a static local-import traversal. This does not detect dynamic dependencies or browser runtime failures.
- Listener registration targets by lexical occurrence: `window` (11), `dom.equation` (10), `document` (6), `dom.identityToolbar` (1), `dom.confirmIdentityButton` (1), `dom.cancelIdentityButton` (1), `dom.equation.parentElement` (1), `dom.multiSelectButton` (1), `dom.hitboxVisibilityMode` (1).
- Node: **387/387 passed** (fresh run). Browser: **74/74 passed**, per user report on preceding baseline. No new browser tests introduced.
- Test runtime on this machine: **3.74 seconds** for Node suite; Playwright runtime and flakiness not independently measured.

## Responsibility groups — named function inventory

The inventory below lists named declarations in `app.js` (anonymous listener callbacks and inline closures are separately characterized below). Line numbers refer to the Phase 5A baseline and will change on extraction.

### Workspace and persistence (18 named functions)

`workspaceMessage` (L472), `activeDocument` (L473), `updateWorkspaceUI` (L474), `renderObjectList` (L478), `loadActiveObject` (L480), `switchObject` (L512), `changeObject` (L521), `captureActive` (L533), `queueSave` (L540), `saveDocument` (L545), `scheduleSave` (L566), `cancelWorkspaceInteraction` (L577), `activateDocument` (L591), `createWorkspaceDocument` (L615), `deleteActiveDocument` (L624), `exportActiveDocument` (L646), `importWorkspaceDocument` (L664), `loadWorkspace` (L685).

### History projection and navigation (7 named functions)

`createStateSnapshot` (L729), `findHistoryNode` (L745), `addHistoryNode` (L749), `restoreHistoryNode` (L772), `renderHistoryTreeInto` (L803), `renderHistory` (L859), `handleHistorySelection` (L3482).

### Rendering and expression editing (12 named functions)

`setStatus` (L705), `setVariableStatus` (L710), `syncExpressionInput` (L715), `createEquationElement` (L883), `renderEquation` (L1315), `renderMathJSONInspector` (L1470), `renderVariables` (L1486), `handleVariableDraftInput` (L1527), `applyVariableValues` (L1534), `clearVariableValues` (L1573), `buildExpression` (L1591), `renderApplication` (L2369).

### Gesture routing and transient geometry (14 named functions)

`positionDragGhost` (L1875), `makeDragGeometry` (L1891), `startDrag` (L1935), `clearDragState` (L2012), `isInsideEquation` (L2020), `finishDrag` (L2041), `cancelDrag` (L2177), `updateDragTarget` (L2191), `refreshDragGeometry` (L2297), `startFactorDrag` (L2618), `updateFactorDrag` (L2658), `cancelFactorDrag` (L2669), `finishFactorDrag` (L2676), `selectTouchNode` (L3031).

### Transformation commit and rearrangement (6 named functions)

`getRearrangementCandidate` (L968), `commitRearrangementCandidate` (L983), `commitNumericCombination` (L1641), `canCombineDraggedSibling` (L1916), `commitDraggedCombination` (L2030), `moveNodeWithKeyboard` (L2323).

### Equality modal lifecycle (1 named functions)

`openEqualityApplication` (L337).

### Negation modal lifecycle (3 named functions)

`cancelNegationPreview` (L1208), `openNegationPreview` (L1221), `confirmNegationPreview` (L1280).

### Identity drag and modal lifecycle (4 named functions)

`cancelIdentityTool` (L914), `identityTargetAt` (L1030), `updateIdentityTool` (L1034), `confirmIdentityTool` (L1050).

### Grouping selection and modal lifecycle (14 named functions)

`rangePlan` (L2409), `paintRangeSelection` (L2705), `releaseGroupingPreviewLease` (L2721), `cleanGroupingPresentation` (L2736), `resetRangeSelection` (L2763), `toggleRangeSelection` (L2773), `enterRangeGroupingPreview` (L2796), `paintRangeSelectionSafely` (L2846), `cancelRangeGroupingPreview` (L2851), `commitRangeGrouping` (L2870), `updateGroupToolbar` (L2940), `addGroupToSelection` (L2972), `removeSelectedGroup` (L2991), `toggleSelectedGroup` (L3006).

### Distribution modal and explanation (6 named functions)

`renderDistributionCurves` (L1419), `releaseDistributionPreviewLease` (L1699), `cancelDistributionPreview` (L1705), `openDistributionPreview` (L1720), `commitDistributionPreview` (L1778), `animateDistributedCopies` (L1843).

### Factorisation modal lifecycle (6 named functions)

`factorPlan` (L2414), `updateFactorisationToolbar` (L2423), `releaseFactorisationPreviewLease` (L2445), `cancelFactorisationPreview` (L2457), `enterFactorisationPreview` (L2479), `commitFactorisationPreview` (L2541).

### Presentation preferences (4 named functions)

`saveHitboxPreference` (L204), `readHitboxPreference` (L207), `applyMultiplicationDisplayMode` (L2350), `applyTheme` (L2354).

### Bootstrap (1 named functions)

`startApplication` (L3529).

## Mutable state and ownership map

| State / resource | Current owner and authority | Consumers and lifecycle | Extraction hazard |
|---|---|---|---|
| `state.expressionRoot`, `state.history`, `state.substitutions` | Active mathematical object mirrored in `app.js`; document controller persists committed state | Render, rules, commit, history, save; replaced on object/history/build | Never introduce a second mutable AST or history authority. |
| `workspace.documents`, `activeId`, `controller`, `dirty`, `saveTimer`, `saveQueue` | `app.js` workspace closure; repository handles durable IndexedDB | Switch/import/delete/save; async save completion gated by `workspaceStatusGate` | Save snapshot timing and asynchronous completion/status identity; 350ms debounce. |
| `state.drag`, `state.factorDrag`, `identityDrag`, `touchTap` | Feature-specific input sessions in `app.js` | Pointer down/move/up/cancel, blur, visibilitychange | Event ordering, pointer capture, stale geometry and late release. |
| `state.multiSelection`, `selectedNodeId`, grouping/factorisation modes | Interaction selection model plus app closure | Touch/keyboard, grouping and factorisation, rerender | Selection is not a mathematical commit; preserve IDs and cancellation semantics. |
| Six `*PreviewLease` variables and `modalPreviewOwnership` | One view-scoped lease registry; feature-local lease holders | Open/cancel/confirm, rebuild, rerender, switch, history | A lease is not a proposal or DOM; cleanup must coordinate all three. |
| `*CommitLifecycle` instances and transformation coordinator | Existing mathematical commit infrastructure | Source-stamp checks, single-use confirm, publication | Do not move commit authority into UI or add parallel publication. |
| `semanticTargetResolver`, `rendererInspector`, `structureNavigator` | View-local semantic DOM index and consumers | `renderEquation()` refresh after `replaceChildren` | DOM references invalid after rerender; preserve refresh ordering. |
| `dragFeedback`, `negationDragFeedback`, overlays, preview UIs | Feature-specific presentation controllers, feedback owner registry | Hover, drag, preview and cancellation | Visual decoration vs interactive affordance vs mathematical authority. |
| `dom` and event listeners | Composition root binds stable DOM nodes | Listener registration and delegated equation events | Moving handlers without teardown/ownership plan can duplicate events. |

## Cross-layer dependency direction

```text
core AST / parser / history / document model     operations / relations / teaching policy
               \                           /
                transformation coordinator and commit lifecycle
                         ^
      interaction adapters and gesture recognizers (advisory)
                         ^
      renderer metadata / semantic resolver / feedback / preview UI
                         ^
                app.js composition and event binding
```

This is a **target responsibility direction**, not a literal acyclic runtime call graph. The static JS import graph currently has no detected cycles. The browser composition root imports many layers directly, which is expected; the issue is **mutable closure coupling**, not necessarily import count.

## Concrete integration seams and caller/lifecycle hazards

### Workspace/document coordination — possible 5C candidate, **conditional**

- Relevant functions: `loadActiveObject`, `switchObject`, `changeObject`, `captureActive`, `queueSave`, `saveDocument`, `scheduleSave`, `cancelWorkspaceInteraction`, `activateDocument`, create/delete/import/export/load.
- Reads/writes: `workspace.*`, `state.expressionRoot/history/substitutions`, active object identity, DOM workspace status, status gate; asynchronously calls IndexedDB repository.
- Callers: workspace/object buttons, startup, history and mathematical commit capture; callbacks also reach rendering and preview cleanup.
- Existing extracted seams: `documentController`, `workspaceNavigation`, `workspaceStatusGate`, `documentRepository`.
- **Risk:** extracting the whole block into a controller would require passing numerous callbacks and might duplicate active-object state. The `saveDocument`/`scheduleSave` queue and status gate are already cohesive; leave them unless a specific dependency improvement is demonstrated. The `loadActiveObject`/`cancelWorkspaceInteraction` boundary is a better characterization target, but it crosses all six preview families and rendering.

### View rerender and invalidation — possible 5D candidate, **high lifecycle risk**

- `renderEquation` owns the sequence: cancel stale previews, collect FLIP geometry, build detached rendered tree, replace DOM, refresh semantic index, inspector and navigator, clear hover, mount equality controls, update toolbars and overlays, then animate surviving nodes.
- Reads: `state.expressionRoot/substitutions/selectedNodeId/distributionPreview`, active object, display preferences, modal state, DOM and preview controllers.
- **Risk:** moving just `replaceChildren` without adjacent refresh/cleanup steps breaks target identity and accessibility. Any extraction must preserve exact ordering and DOM attachment requirements; separate pure computation from imperative coordination only if a clear seam exists.

### Modal-preview coordination — defer generic extraction until a cross-family contract is proven

- Existing shared registry owns exclusivity only. Feature-specific preview controllers own educational DOM; commit lifecycles own proposal consumption; `app.js` orchestrates both.
- Six families: negation, equality, identity, grouping, distribution, factorisation. Each has different UI and cleanup pathways.
- **Risk:** a generic preview manager may collapse distinct cancellation semantics or hide failures. Keep feature-local cleanup until fault-injection and cross-family browser coverage justify a small common helper.

### Gesture and event binding — retain in composition root for now

- Ordinary/factor/identity drag and touch/keyboard paths use delegated equation listeners and window/document pointer, blur, scroll and visibility listeners.
- Existing arbitration adapters are pure and owner-scoped. Hit testing is geometric; semantic targeting is AST-addressed; neither commits mathematics.
- **Risk:** extracting handlers can change event ordering, double-handle pointerup, or lose pointer capture. First characterize listener ownership and cancellations; avoid a universal event bus.

### History presentation — promising **small** seam

- `renderHistoryTreeInto` and `renderHistory` are primarily DOM projection; `createStateSnapshot`, `addHistoryNode`, `restoreHistoryNode` are authoritative transitions and must stay close to commit/capture logic.
- A history-tree rendering helper could accept explicit history data and DOM callbacks; do **not** move mutation or restoration into the renderer.
- **Risk:** focus/aria-current and branching selection must survive import/reload and autosave timing.

## Event binding characterization

- The source contains **69** direct registration sites; most are in the lower `app.js` event-wiring region, with identity drag listeners earlier. This lexical count is not proof of duplicated runtime listeners.
- Equation pointer/click/keydown delegation has multiple handlers for different features; event ordering and guards matter. Window-level `pointerup`, `pointercancel`, `blur`, `scroll`, and document `visibilitychange` are critical cancellation edges.
- **Before extracting:** for each handler record its target, event type, ordering, capture/passive options, ownership guard, state it mutates, and teardown needs. A single registration table may be a useful future documentation artifact, not automatically a new runtime abstraction.

## Phase 5A extraction shortlist and decisions

| Candidate | Decision | Rationale / first verification gate |
|---|---|---|
| History tree DOM projection | **Explore first** | Narrow input/output; protect branch navigation and `aria-current` browser tests. |
| Workspace save/status queue | **Retain existing seam** | Already separated repository and status gate; avoid changing debounce/persistence semantics. |
| Object switch cleanup orchestration | **Characterize further** | High fan-out across modal families; add transition matrix before extraction. |
| Equation rerender invalidation | **Characterize further** | Strict ordering across DOM, resolver, overlays and focus. |
| Universal preview manager | **Reject for Phase 5** | Shared ownership already exists; mathematical previews are feature-specific. |
| Universal gesture coordinator/event bus | **Reject for Phase 5** | Would increase indirection and risk event-order regressions. |
| DOM binding registry | **Retain existing module** | `queryApplicationDom` already extracts lookup responsibility. |

## Acceptance and rollback criteria

1. Preserve current **387/387 Node** and owner-reported **74/74 browser** baseline. No production changes in 5A, so no new browser result is claimed.
2. In 5B, add only narrowly scoped dependency checks and characterization tests; fail on actual forbidden layer imports, not broad style conventions.
3. Any future extraction must identify a single owner, explicit inputs/outputs, cleanup/teardown, affected event order and rollback patch. Stop on any mismatch in AST IDs, history cursor, preview lease, status message or accessibility behaviour.
4. The first candidate extraction should be reviewed against actual callers and browser tests before implementation; do not assume the 5C/5D order is fixed.

## Outstanding verification questions

- Which direct DOM queries represent legitimate geometric hit testing versus duplicated semantic resolution?
- Can fault injection into post-commit visual cleanup strand a lease or leave a partially rendered view?
- Are all view-identity strings consistently sourced from the same view context?
- Which listeners could be registered more than once if composition is reinitialized or a view is remounted?
- Does history DOM projection have hidden dependencies on live closure state that make extraction less valuable than it appears?

**Conclusion:** `app.js` is large primarily because it coordinates several already-modular subsystems and owns numerous mutable closure variables. The safest Phase 5 strategy is to characterize boundaries and extract only cohesive, low-fan-out responsibilities with demonstrated integration value. The recommended first candidate is history-tree presentation, not a wholesale workspace or gesture-controller rewrite.
