# Current system overview

**Code-checked against v3 source.** The implementation is an offline browser ES-module application. `js/app.js` remains the active application integration point; it is **not** yet a minimal composition root or a generic multi-window host.

```text
Pointer / keyboard / toolbar
  → DOM hit-testing + transient interaction state (js/interaction/)
  → interaction recognition (existing js/manipulator/*Gesture.js adapters)
  → interpreted mathematical intent
  → registered rule-application proposal (js/composition/transformationFeatureAssembly.js)
  → mathematical rule (js/operations/, js/relations/)
  → optional feedback / preview (js/rendering/, js/interaction/)
  → stale-safe single-use confirmation (transformationCommitLifecycle.js)
  → detached history preparation (atomicTransformationCommit.js)
  → synchronous in-memory publication (transformationPublication.js)
  → application rendering + separately scheduled persistence
```

**Authority:** the active Mathematical Object's AST and history are the source of mathematical truth. The engine decides mathematical eligibility, not the DOM. The renderer decides notation and hitboxes, not mathematical validity. A Document groups objects; a Workspace groups documents. A preview must not mutate committed mathematics.

**Implemented boundaries:** feature registry, coordinator, mathematical rules, gesture adapters, renderer, teaching policies, extracted equality and clipboard UI controllers, shared lifecycle for seven major families, and a common publication helper. **Remaining debt:** feature-specific UI integration in `app.js`, historical proposal shapes, root-equality assumptions and single-active-view dependencies. See [Transformation framework](Transformation_Framework.md) and [Current status](../05_Roadmap/Current_Status.md).

**Vocabulary:** [Interaction, Intent and Rule Application](../04_Reference/Interaction_Intent_and_Rule_Application_Terminology.md). “Rule Application Coordinator” is the proposed conceptual description of the existing Transformation Coordinator, not a source rename. The engine checks the applicability of a *student-requested* rule; it does not choose a strategy.
