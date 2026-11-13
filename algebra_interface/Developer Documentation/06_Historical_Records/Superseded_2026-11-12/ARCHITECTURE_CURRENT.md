# Manipulator — current architecture

**Baseline (2026-11-11):** Equality Escape Propagation Boundary release, 628 Node tests. The user reported the full Playwright suite passing on that release. This maintainability increment changes documentation only; browser tests have not been rerun here. Source code is authoritative when documents disagree.

## Purpose and invariants

Manipulator is an **offline, student-directed algebra teaching interface**, not an automatic solver. Students choose transformations; mathematical rules determine eligibility. Preserve stable AST occurrence IDs where mathematically meaningful, source-stamped single-use commits, explicit preview/cancellation, faithful history, and non-mutating previews. Keep the design extensible to matrices, vectors, and noncommutative operations. Avoid changing the tree merely to update its presentation.

## Responsibility boundaries

| Owner | Contract | Must not own |
| --- | --- | --- |
| `js/steps/transformationCoordinator.js` and registered features | Propose detached mathematical results; describe semantic feedback | DOM, pointer geometry, history publication |
| `js/input/`, `js/interaction/` | Interpret gestures and semantic targets; arbitrate input | Mathematical validity based solely on pixels |
| `js/rules/<rule>/` | A rule bundle: `rule.js` (registry entries, gesture declarations) and `install.js` (routes, preview, drop targets, keyboard commands, through the rule context). So far: negation, rearrangement, numeric-combination, identity, grouping, distribution, factorisation, equality (all rules) | Importing app.js, another rule, the renderer or UI |
| `js/view/inputRouter.js` | The only pointer/key listening for the equation view: named routes in order, each with the modes it runs in; gesture declarations and `gesturesFor(part)` | Rules, DOM structure, application state |
| `js/view/viewMode.js` | The one mode per view (`idle`, `dragging`, `preview`): which drag or preview holds the equation view; `isIdle()` answers "can something start?" | DOM, rules, rendering |
| `js/steps/previewSessionHost.js` (lease from `viewMode.preview`) | Source-stamped, single-use modal proposal, lease, confirmation and terminal cleanup | Feature-specific visual layout |
| Feature preview adapters | Render/cancel their own temporary presentation | Independent mathematical commit authority |
| `js/steps/atomicTransformationCommit.js`, `transformationPublication.js` | Prepare detached result/history and publish coherent state | Visual preview layout |
| `js/definitions/define.js`; `js/definitions/types/`, `js/definitions/operators/`, `js/relations/` (each `<id>/index.js` plus a registry file); `js/engine/structures.js` | Definition objects (Engine stage E3): a type says which properties each operation has; an operator holds its notation rows and precedence; a relation its properties and both-sides effects. `structures.js` answers property questions and checks a rule's `requires` (the coordinator calls it) | Rules writing properties into their own code |
| `js/definitions/interactions/` (`<id>/index.js` plus `interactions.js`); `js/definitions/operators/presentation.js` | The gestures as definitions (stage I1), read by the input router; how each operator is drawn and handled on screen (`sequenceOf`, `isTermSequence`, `signDrawnInside`) | Node-type names in interaction-side code (a test forbids them; `nodeSpecs.js` is the one exception) |
| `js/engine/notation.js`, `parser.js` | The notation table: every sign as a row (infix levels, juxtaposition, prefix, brackets, relations, print rows) with its messages; the generic parser and printer that read it (Engine stage E2) | Signs or node names written into the parser (a test forbids them) |
| `js/engine/nodeRegistry.js`, `canonicalText.js` | Every node type as data (category, relation, child slots, meaning and notation fields); the canonical text form (Engine stage E1). Generic code asks the registry (`isRelationNode`, `childEntries`), never `type === 'Equal'` | What a node means (value, rules, notation rows): operator, type and relation definitions, stages E2–E3 |
| `js/view/rendering/domRenderer.js` | Convert AST to detached semantic DOM | Modal lifetime or context navigation |
| `js/view/equationPresentationMount.js` | Invalidate semantic addresses, replace DOM, refresh targets, update toolbars before overlays and animation | AST transformations, history, preview leases |
| `js/app/applicationState.js` | `documentState` (tree, history, assigned values), `viewState` (selection, drafts, sign display), `preferences` (theme) | Drags and previews (the view mode owns them) |
| `js/app/ruleExtensions.js`, `ruleContext.js` | The lists rules register into, and the generic services every bundle receives | Anything named after a rule |
| `js/view/equationView.js` | `renderMath`, `renderEquation` (the one DOM replacement), `renderApplication` | Mathematics, preview decisions |
| `js/view/selectionView.js`, `equationSelectionRoutes.js`, `equationRoutes.js` | The shared multi-selection and general toolbar; the equation's own routes, before and after the rules' routes (order checked by `e2e/view/route-order.spec.js`) | Rule behaviour |
| `js/view/drag/ordinaryDragView.js` | The ordinary drag: pickup, pointer following, exits through rule drop targets | Committing (rules commit) |
| `js/view/historyView.js`, `js/app/ui/symbolPanel.js` | History steps and the history tree; the symbol list and values | Selection, previews |
| `js/app/workspace/workspaceSession.js`, `workspaceControls.js`, `js/app/ui/panelControls.js` | Documents, objects, saving, import/export (document state only; the view through hooks); the wiring of page controls to named actions | The equation view, rules |
| `js/app.js` | Start-up only: create the modules in dependency order, install the rule bundles, bind the controls (about 640 lines, no decision by feature name) | Behaviour of its own |
| Workspace/document and history modules | Own active object, detached working snapshots, persistence and revisions | Preview-specific decorations |

## Presentation and context contracts

- `renderEquation()` in `js/view/equationView.js` resolves DOM-bound preview lifetime, captures prior geometry, renders a detached tree and calls `mountEquationPresentation()`. Distribution preview has a deliberate preservation/rebuild exception.
- The mount invalidates old semantic addresses **before** `replaceChildren()`, refreshes indexing **before** consumers, then updates layout-affecting toolbars **before** geometry-dependent overlays. A failure invalidates the semantic resolver again.
- Context changes call `cancelWorkspaceInteraction()` / `dismissPreviewsForContextChange()` before replacing the active source. The dismissal inventory covers six deliberate preview families; a surviving modal lease prevents navigation.
- Feature-specific Escape handlers consume the keypress when they dismiss a preview; the application fallback handles unconsumed Escape. Ordinary outside clicks and explicit workspace navigation have distinct contracts.
- Working snapshots and history snapshots must not alias mutable committed records. Persistence failures must not silently turn a successful in-memory mathematical commit into an uncommitted one.

## Verified walkthroughs and debugging

See [END_TO_END_TRANSFORMATION_WALKTHROUGH_628.md](END_TO_END_TRANSFORMATION_WALKTHROUGH_628.md) for three source-traced paths, exact entry points, invariants, and debugging starting points. These are source-level walkthroughs, not claims of manual UI execution in this increment.

## Verification

Run `node scripts/run-node-tests.mjs`, `node scripts/check-documentation-links.mjs`, and `npx playwright test`. Record browser evidence separately from local Node results. The most recent user-confirmed browser baseline is the Equality Escape Propagation Boundary release; this documentation-only increment requires no new browser behaviour.

## Historical evidence

Chronological material has been preserved in [ARCHITECTURE_CHRONOLOGY_ARCHIVED.md](../Increment_Notes_to_628/ARCHITECTURE_CHRONOLOGY_ARCHIVED.md) and [HANDOVER_CHRONOLOGY_ARCHIVED.md](../Increment_Notes_to_628/HANDOVER_CHRONOLOGY_ARCHIVED.md). These are evidence, **not active instructions**. The [boundary review](ARCHITECTURAL_BOUNDARY_REVIEW_628.md) records the preceding assessment. Do not add another abstraction solely to shorten `app.js`; change ownership only for a demonstrated contract violation.
