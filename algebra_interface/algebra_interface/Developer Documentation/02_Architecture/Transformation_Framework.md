# Transformation framework — current implementation

`js/manipulator/transformationFeatures.js` defines the registry; `js/composition/transformationFeatureAssembly.js` wires stable rule IDs to proposal functions and optional gesture, feedback and visual adapters; `js/manipulator/transformationCoordinator.js` dispatches registered proposals.

Seven principal transformation families share `createTransformationCommitLifecycle()` and detached history preparation: equality function application, identity insertion, distribution, factorisation, grouping, rearrangement and numerical combination. Their student-facing confirmation modes differ (some deliberate preview, some immediate drop). Do not force a modal preview for all features.

`transformationCommitLifecycle.js` source-stamps proposals, rejects stale confirmation and consumes each proposal once, including reentrant calls. `atomicTransformationCommit.js` prepares candidate root/history away from authoritative state. `transformationPublication.js` prepares document replacement before synchronous publication. This is **failure-safe preparation**, not a fully atomic database transaction; IndexedDB durability remains separate.

`transformationCandidate.js` recognizes eligibility-only versus materialized candidates, including transitional legacy shapes. This avoids constructing large AST candidates on every hover. `app.js` still owns feature-specific feedback/cleanup and post-commit rendering/persistence scheduling. See [Contract reference](../04_Reference/Transformation_Contracts.md) and [Adding a transformation](../03_Developer_Guides/Adding_a_Transformation.md).

## Student-directed rule application (terminology)

A recognizer proposes an interpretation of an interaction; the interpreter resolves intent; the existing Transformation Coordinator routes a specified rule request; the Mathematical Engine checks that rule’s preconditions and produces a candidate result. “Transformation” in existing API names describes the resulting structural change, not autonomous selection by the engine. See the [maintained terminology reference](../04_Reference/Interaction_Intent_and_Rule_Application_Terminology.md).
