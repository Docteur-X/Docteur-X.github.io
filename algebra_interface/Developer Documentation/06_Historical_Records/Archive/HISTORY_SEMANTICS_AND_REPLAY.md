# Mathematical history, document history and replay

**Status:** Mathematical per-object history is implemented; distinct document-level organisational events, timeline inspection and visual replay are future work.

## Why a rule request is not an event

The Gesture Interpreter (or keyboard/API) produces an **intention**; the Transformation Coordinator asks the Engine for a valid candidate. Hover, rejected requests and cancelled previews do not change the Mathematical Object. Only a successful, atomic commit becomes a mathematical-history event. Thus different gestures invoking the same rule should yield equivalent *mathematical* records.

A committed mathematical event should retain enough to explain/reconstruct the step: stable rule ID and relevant rule semantics/version, validated inputs, source and result state IDs, structural patch/checkpoint, occurrence IDs, provenance and applicable assumptions. The Engine supplies mathematical facts; the Visualiser turns those into pedagogical arrows/fades. Recording the student's pointer trajectory is neither necessary nor appropriate for mathematical replay.

## Two categories of lasting change

| Category | Scope | Examples | State today |
| --- | --- | --- | --- |
| **Mathematical History** | One Mathematical Object | Distribution, factorisation, grouping, rearrangement, equality transformations | Branching snapshot/event model implemented |
| **Document History** | Document's object collection and cross-object activity | Create/copy/delete/reorder objects, later coordinated cross-object actions | Proposed distinct event stream; current object-management persistence is not equivalent to full document undo history |

Cross-object mathematical operations may create one mathematical event in the target object and a document-level reference to the broader activity. If several objects are changed, commits should be atomic. Source provenance should identify document, object, historical state and node; copying creates fresh occurrence IDs. Annotations can later be a non-mathematical event category. Temporary hover, drag, selection and preview cancellation normally belong to neither history.

## Inspection is not editing

History navigation should use a read-only inspected state distinct from the active committed cursor. **Replay** renders the transition between two historical states using recorded mathematical provenance, without creating a new event. **Reapply** or **Continue from here** is explicit and may branch. A timeline slider requires a chosen path through branching history.

Compact export must preserve enough rule and provenance data for reconstruction and explanation; do not equate structural replayability with semantic explainability. Older event formats may need migration, fallbacks or versioned rule interpreters.

See [pedagogical vision](PEDAGOGICAL_VISION.md), [event sourcing](EVENT_SOURCED_HISTORY.md), and [Transformation Features](TRANSFORMATION_FEATURES_AND_EXPLANATION_DEPTH.md).
