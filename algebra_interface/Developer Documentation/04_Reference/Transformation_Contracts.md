# Transformation contracts — implemented and transitional

Source of truth: `js/manipulator/transformationFeatures.js`, `transformationCoordinator.js`, `transformationCandidate.js`, `transformationCommitLifecycle.js`, `atomicTransformationCommit.js`, `transformationPublication.js` and `js/composition/transformationFeatureAssembly.js`.

A registry entry has `id` (stable rule identifier), `propose(root, parameters)`, `confirmationMode` (`preview` or `immediate`), and optional `gesture`, `gestures`, `feedback`, `visual`. Registry validation checks these basic shapes and freezes descriptor/gesture-array metadata; it does not deeply validate returned mathematical proposals.

The coordinator dispatches proposals by rule ID. Results may be eligibility-only plans or materialized AST candidates; compatibility accessors accept older result shapes. The commit gate requires a materialized proposal with `result.root`, a source stamp containing document/object IDs, revision, root ID and AST fingerprint, and consumes it before invoking the commit callback. Detached preparation constructs root/history before publication. Publication prepares the document first, then synchronously assigns root/history/document; it does not save to IndexedDB.

**Limits:** proposal references are not universally deeply immutable; `gesture` versus `gestures` remains a compatibility convention; result metadata is not fully standardized; the publication boundary is not a database transaction. Read actual function signatures before extending. See [Transformation framework](../02_Architecture/Transformation_Framework.md).
