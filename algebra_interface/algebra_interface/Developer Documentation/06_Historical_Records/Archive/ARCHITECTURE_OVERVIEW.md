# Architecture overview — current implementation

**Status:** handover map for the 4 November 2026 project. File paths below are verified against the packaged source. This describes conceptual boundaries; some orchestration remains in `js/app.js`.

## Six cooperating systems

| System | Current source locations | Responsibility |
| --- | --- | --- |
| Mathematical Model | `js/core/nodeFactory.js`, `nodeCategories.js`, `treeUtils.js`, `parser.js`, `operatorMetadata.js` | Construct, parse, traverse and describe mathematical AST nodes. |
| Mathematical Engine | `js/operations/`, `js/relations/equality.js`, `js/core/normalization.js` | Validate and construct transformations, evaluate permitted operations. |
| Teaching Policy | `js/teaching/factorisationPolicy.js` | Decide when a mathematically valid action is pedagogically available. |
| Mathematical Manipulator | `js/app.js`, `js/interaction/`, `js/rendering/domRenderer.js` | Interpret gestures, resolve hitboxes, coordinate preview and confirmation, render mathematics. |
| History and Provenance | `js/core/documentHistory.js`, `js/core/documentController.js` | Branching states, snapshots, versioned events, replay and document-specific commits. |
| Documents and Workspaces | `js/core/mathematicalDocument.js`, `workspaceDocuments.js`, `documentRepository.js`, `documentController.js`, `js/app.js` | Document identity, multi-object ownership, active-object coordination, IndexedDB and JSON import/export. |

## A transformation from gesture to history

1. The browser reports pointer activity; `js/app.js` and helpers in `js/interaction/` resolve the intended target using stable hitboxes.
2. The relevant operation module checks mathematical eligibility; teaching policy may further restrict whether the student can invoke it.
3. The Manipulator displays a temporary candidate through preview/rendering helpers. The committed AST and history do not change.
4. Confirmation commits the result to the active document and records a branching history state/event; cancellation discards the candidate.
5. Document persistence is handled separately through the repository. Saving is not a mathematical transformation.

**Example:** the identity toolbar uses `js/interaction/identityDragFeedback.js` for stationary drag feedback, `js/operations/identityInsertion.js` for the candidate transformation, and `js/interaction/identityTool.js` for the post-drop preview.

## Architectural cautions

- `js/app.js` is still a large coordinator; do not mistake conceptual separation for complete extraction into reusable Manipulator instances.
- An `Equal` root has two expression children; rules and renderers must support eligible nested subtrees rather than assuming an `Add` document root.
- Only scalar equality is currently supported; future matrix, vector and Boolean types need a richer type system.
- The current UI activates one Mathematical Window/Manipulator at a time; multi-window selection and embeddable instances remain future work.
- Event-only history serialization/replay exists in the library, but workspace document exports currently include snapshots. Keep those facts separate.

## Where to read next

- [Current status](CURRENT_STATUS.md) — what actually works today.
- [Terminology](TERMINOLOGY.md) — Window, View, Manipulator, Gesture Interpreter and Engine.
- [Architecture decisions](ARCHITECTURE_DECISIONS.md) — rationale and trade-offs.
- [Interaction architecture](INTERACTION_ARCHITECTURE.md), [History](EVENT_SOURCED_HISTORY.md), [Workspace](WORKSPACE_V1.md) — subsystem details.
- [Future features](FUTURE_FEATURES.md) — deferred work, not present capability.

## First Manipulator contract extraction (2026-11-05)

See [MANIPULATOR_ARCHITECTURE_V1.md](MANIPULATOR_ARCHITECTURE_V1.md). Identity insertion introduced the gesture adapter → immutable action request → transformation coordinator → Engine proposal → preview coordinator/visual descriptor → document commit contract. Distribution, grouping, factorisation and rearrangement subsequently adopted these contracts; their proven visual DOM implementations remain in place.

## Factorisation migration note

Factorisation gesture interpretation (`js/manipulator/factorisationGesture.js`) and semantic preview descriptors (`factorisationVisual.js`) are separate from the pure Engine rule and teaching policy. `app.js` currently registers the rule adapter and coordinates the established overlay; see [factorisation migration](FACTORISATION_ARCHITECTURE_MIGRATION.md).

### Rearrangement migration (2026-11-05)

Pointer and keyboard rearrangement now share `rearrangementGesture.js`, the read-only proposal/Engine adapter in `rearrangementRule.js`, and `rearrangementVisual.js`. The existing stable geometry and animation code remains in the interaction layer. See [rearrangement migration](REARRANGEMENT_ARCHITECTURE_MIGRATION.md). Pointer drop still commits without a second animation.


## Current feature-registry boundary and future learning interfaces

The implemented [Transformation Feature Registry v1](TRANSFORMATION_FEATURE_REGISTRY_V1.md) groups seven rule IDs across five interaction families, and the Transformation Coordinator uses its proposal references. Gesture and visual adapters are independently maintained; the established DOM hover/preview code and substantial `app.js` orchestration remain. **Registration does not automatically route every gesture or render every preview.**

The current Mathematical Document contains multiple Mathematical Objects, each with its own AST/history; it is not one AST. Proposed document-operation history, historical replay, annotation overlays and an embeddable teaching-site API are deliberately outside the Engine. See [history semantics](HISTORY_SEMANTICS_AND_REPLAY.md), [pedagogical vision](PEDAGOGICAL_VISION.md), and [annotations](ANNOTATIONS_AND_INSPECTION.md).
