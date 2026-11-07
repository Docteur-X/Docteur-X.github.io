# Mathematical Manipulator architecture — first extraction (2026-11-05)

## Scope and status

The first release introduced **working, tested contracts** for toolbar identity introduction. The next incremental release also migrated **distribution action dispatch and preview lifecycle**. Factorisation and rearrangement have **not** migrated; range grouping now uses the shared contracts. Distribution still uses its proven stable hit-testing, amber hover, arrow overlay and one-line preview renderer. Do not delete them or attempt a wholesale rewrite without browser regression checks.

## Responsibility map

| Module | Owns | Must not own |
| --- | --- | --- |
| `js/manipulator/distributionGesture.js` | Converts an eligible distribution plan into a DOM-free action request | Engine validity or pointer geometry |
| `js/manipulator/distributionVisual.js` | Describes distribution source, sum, direction and confirmation role | DOM painting or algebraic transformations |
| `js/manipulator/identityGesture.js` | Hitbox/operator targeting, left/right half, action intent | Mathematical validity, AST edits |
| `js/manipulator/actionRequests.js` | Immutable, DOM-free rule requests | Pointer events, colours |
| `js/manipulator/transformationCoordinator.js` | Explicit rule dispatch and candidate metadata | Mathematical implementation, history |
| `js/manipulator/previewCoordinator.js` | Preview open/confirm/cancel and revision guard | Rendering, mathematical validity |
| `js/manipulator/identityVisual.js` | Identity-specific explanatory roles (new occurrence, source, confirm target) | DOM creation, AST edits |
| `js/operations/identityInsertion.js` | Validate and construct proposed mathematical tree | UI, hover, history |
| `js/interaction/identityDragFeedback.js` | Floating tool, stationary amber hover, hints | AST edits |
| `js/interaction/identityTool.js` | Render candidate with existing renderer in inert overlay | Mathematical permission, history |
| `js/app.js` | Wire active object, lifecycle and history commit | Rule definitions |

## Lifecycle

1. Renderer displays the committed AST and hitboxes.
2. Identity gesture adapter resolves an operator gap or operand half into an immutable action request.
3. Coordinator dispatches the request to the Engine. Invalid requests return `null`.
4. During dragging only the ghost, hint and amber target outline update. Neither the AST nor the expression DOM is rebuilt.
5. On valid drop, preview coordinator records the candidate and current history state ID; identity visual descriptor identifies the new occurrence; existing preview renderer displays the candidate.
6. On confirmation, preview coordinator checks the same history state remains current, then app commits the **already previewed** candidate and records exactly one history event. On cancellation, nothing is committed.

The history-state ID guard protects normal history navigation and committed transformations. Future simultaneous Manipulators should use a monotonic object revision as well, because an object could change without changing its history cursor in future designs.

## Contracts and extension path

- `identityActionRequest({ operation, targetNodeId, side })` or `{ operation, parentNodeId, insertionIndex }` produces `{ ruleId, parameters }`.
- `createTransformationCoordinator({ [ruleId]: { propose, confirmationMode } })` maps requests to pure rules. Register known rules explicitly; do not import arbitrary modules from user-provided rule IDs.
- `createPreviewCoordinator()` manages one pending candidate and guards confirmation against stale revisions.
- `describeIdentityPreview(candidate)` returns presentation semantics, not colour codes or layout geometry.

Distribution migration: stable drag geometry still determines eligible `getDistributionPlan()` targets; `distributionActionRequest()` converts the plan into a structured intention; the coordinator rechecks the plan using the Engine; `describeDistributionPreview()` supplies presentation roles; the shared preview coordinator guards the current history revision; confirmation calls `applyDistribution()` and records one event. Cancelling, object switching, history checkout, and expression rebuilding clear the pending preview.

Migration status: identity insertion, distribution, range grouping, factorisation and rearrangement have been migrated incrementally. Browser verification remains important after each change. Avoid a plugin framework until real duplication justifies it.

## Safety and verification

Run `node --test tests/*.test.js`. Tests cover action immutability, target interpretation, dispatch, visual semantics, and stale/cancelled previews. Also verify in a real browser: drag `+0` and `×1` onto both halves of an operand and matching operators, confirm/cancel, switch objects during preview, and verify distribution, factorisation, grouping and rearrangement still behave identically. Automated tests do **not** establish pointer/animation correctness.

Keep documentation aligned with source. The Engine remains DOM-free, temporary previews never enter history, and unchanged node IDs must survive transformations. Pedagogical clarity takes priority over premature generalisation.

## Range grouping migration (current)

Range grouping now uses `groupingGesture.js` for immutable requests, `groupingVisual.js` for presentation semantics, the shared transformation coordinator for Engine eligibility, and the shared preview lifecycle for cancellation and stale-revision protection. The existing blue overlay and Ctrl/Cmd selection are intentionally retained. See [GROUPING_ARCHITECTURE_MIGRATION.md](GROUPING_ARCHITECTURE_MIGRATION.md). Factorisation and rearrangement have subsequently been migrated; their established rendering and animation mechanics remain in place.

## Future design: Transformation Features and explanation depth

See [TRANSFORMATION_FEATURES_AND_EXPLANATION_DEPTH.md](TRANSFORMATION_FEATURES_AND_EXPLANATION_DEPTH.md) for the proposed feature registry and inspectable, adjustable explanations. Neither is implemented in architecture v1.
