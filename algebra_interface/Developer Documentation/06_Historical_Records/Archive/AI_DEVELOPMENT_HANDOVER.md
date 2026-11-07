> **Latest code handover:** [Transformation Infrastructure Consolidation v3](TRANSFORMATION_INFRASTRUCTURE_CONSOLIDATION_V3.md). All seven migrated features share `publishPreparedTransformation`; numeric combination now dispatches via registry. Run browser tests before release.

> **Latest source handover (2026-11-06):** [Grouping Shared Lifecycle Migration v1](GROUPING_SHARED_LIFECYCLE_MIGRATION_V1.md). 244 Node tests passed; 32 Playwright tests pending. Grouping joins equality, identity, distribution and factorisation on the shared source-stamped commit lifecycle. Older baseline descriptions below are historical; inspect current code/tests.

> **Latest source handover:** [Distribution Shared Lifecycle Migration v1](DISTRIBUTION_SHARED_LIFECYCLE_MIGRATION_V1.md) migrates only distribution confirmation to the shared atomic gate. Browser verification pending.

> **Latest increment (2026-11-06):** Transformation Feature Contract v1. Equality application now goes through the transformation registry/coordinator; `js/manipulator/equalityFunctionVisual.js` provides semantic descriptors. 220 Node tests passed; browser verification pending. Read [TRANSFORMATION_FEATURE_CONTRACT_V1.md](TRANSFORMATION_FEATURE_CONTRACT_V1.md) before adding rules. Broader UI extraction remains deferred.

> **Non-negotiable founding vision:** Read [FOUNDING_VISION_STUDENT_AGENCY.md](FOUNDING_VISION_STUDENT_AGENCY.md) before changing mathematical interactions or teaching policy. The student chooses transformations; the engine enforces rules; the system preserves inspectable reasoning.

# AI development handover — Mathematical Manipulator

**Baseline:** 5 November 2026, consolidated architecture documentation / Transformation Feature Registry v1.  
**Status:** This is a navigation and continuation guide, not a replacement for source code or `CURRENT_STATUS.md`.  
**Last recorded verification:** 168/168 Node tests passing in this baseline; rerun before changing code. Browser checks are separate.

## Purpose and teaching philosophy

Build an offline-capable, lightweight **visual mathematical manipulator** that helps students understand and deliberately perform mathematical transformations. Make the mathematical structure experts hold mentally tangible through expression trees, hitboxes, gestures, and explanatory previews. **Pedagogy and mathematical correctness come before feature count or performance metrics.** Explicit instruction should support beginners without continually interrupting fluent problem-solving. Long-term aim: explanations on demand and inspectable/replayable provenance.

## Current implementation (verify against source)

- Scalar expression AST and binary equality; grouping, rearrangement, arithmetic evaluation, distribution, factorisation, equality symmetry, and `+0`/`×1` identity insertion.
- Mathematical Manipulator with stable hit-testing, hover feedback, selection, explanatory previews and identity toolbar.
- **Transformation Feature Registry v1**: seven rule IDs across five interaction families; immutable action/gesture/visual contracts. `app.js` still coordinates substantial UI behaviour. Registry is not a complete plugin or gesture-resolution framework.
- **Document schema v2**: a document contains multiple independently evolving Mathematical Objects; each owns an AST, assignments and branching snapshot/event history. Workspace supports IndexedDB and JSON import/export.
- History library has event-only serialization/replay, but **compact export for multi-object documents is not integrated in this release**. Current workspace export is full JSON.

## Architectural boundaries — protect these

1. **Engine:** mathematical structure, applicability, transformations and provenance; no DOM, pointer or CSS dependencies.
2. **Manipulator:** gesture interpretation, visual feedback, preview/explanation and interaction coordination; should not independently decide mathematical truth.
3. **Teaching Policy:** pedagogical restrictions distinct from mathematical validity.
4. **Mathematical Object:** one evolving AST and its mathematical history. **Document:** collection/organisation of objects; **Workspace:** collection of documents.
5. **History:** record committed mathematical transformations (rule, parameters, state, patches and provenance), not mouse movements or cancelled previews. Document-level organisational events are a future separate concern.
6. **Renderer:** ordinary mathematical notation and hitboxes; visual adapters describe explanatory decorations, not mathematical rules.
7. **Node IDs:** preserve unchanged occurrences; allocate fresh IDs for new occurrences and retain source references when copying.

## Interaction invariants

- Never mutate committed AST or history while dragging, hovering or previewing.
- Stable hitbox geometry during drag; preserve the tested no-jitter rearrangement and no second animation after drop.
- Confirmed proposals must be rechecked against the current history state; switching objects/documents cancels transient interactions.
- Associativity/commutativity and factorisation left/right order are mathematical constraints, not UI assumptions.
- Keep existing amber/green/blue semantic feedback and accessible non-hover pathways in mind.

## Next work — in order

1. **Reconcile compact history export/import with schema-v2 multi-object documents**, preserving full-JSON backward compatibility, branching, IDs, provenance and failure-safe validation.
2. **Copy as New Mathematical Object**: source can be an expression, subexpression or complete statement; copy within/across documents with fresh IDs and recorded origin. Copying does not assert equality. Begin document-operation history design.
3. **Cross-object equality transformations**, e.g. use a separate `-3` expression to add to both sides of an equation, followed by justified equality substitution.

## Agreed future ideas — not yet implemented

- Transformation Feature definitions may eventually declare supported confirmation modes; teaching policy and student preference choose preview vs immediate commit.
- **Reversible explanatory depth**: explicit, guided and fluent modes; historical timeline/scrubbing, inspect/replay without history mutation, and explicit reapply/branch actions. Replays should use rule/provenance records, not recorded mouse trajectories.
- Separate **Annotation Layer** for circles, labels, underlines and verbal explanations; annotations reference mathematical occurrences but do not change ASTs.
- Logical connectors, richer typed relations, fractions/matrices, multiple simultaneous Manipulators, embeddable teaching-site API, and low-end-device/accessibility evaluation.

## How to resume safely

1. Read `README.md`, `Developer Documentation/CURRENT_STATUS.md`, `PROJECT_CONTEXT.md`, `ARCHITECTURE_OVERVIEW.md`, `ARCHITECTURE_DECISIONS.md`, and the relevant subsystem guide.
2. Inspect actual source and run `npm test` (or `node --test tests/*.test.js`) before changing anything. For local browser use, serve the root via `python -m http.server 8000` and open `http://localhost:8000/`; do not use `file://`.
3. Make one focused change at a time. Preserve Engine/Manipulator/Document boundaries and current pedagogical behaviour; add regression tests and brief, purposeful comments explaining non-obvious choices.
4. Test critical gestures in a browser, especially preview confirmation/cancellation, equation-side operations, object switching and rearrangement timing. Unit tests alone do not establish UI correctness.
5. Update `CURRENT_STATUS.md` (verified count and limitations), relevant design/feature guides, and this handover when the roadmap changes. Keep proposed features clearly labelled.
6. Deliver a **complete ZIP** of the project (the owner's preferred workflow), verify archive integrity, and optionally commit to GitHub. Never silently substitute an older branch or drop features.

**Authority order:** current source/tests → current developer documentation → versioned releases → historical conversations. If they disagree, investigate and document the discrepancy instead of guessing.

## Latest architectural consolidation

Read [Application Controller Consolidation v1](APPLICATION_CONTROLLER_CONSOLIDATION_V1.md) for ownership boundaries and team onboarding. The latest automated baseline is **171 tests passing**; browser interaction verification remains pending. `app.js` is still the browser integration coordinator, not yet a minimal composition root.

**Testing update (2026-11-05):** See `TEST_RELIABILITY_CORRECTNESS_AUDIT_V1.md`. The prior seven Playwright tests passed on the owner’s machine. The strengthened browser suite requires a new Chromium run; 172 Node tests and one mutation probe pass.

### Equality Function Application v1.3 (2026-11-06)
See `EQUALITY_FUNCTION_APPLICATION_V1_3_GROUPING_RENDERER_PREVIEW.md` for explicit new-operand grouping, renderer-owned semantic preview roles, validation, and deferred architectural consolidation. The next milestone is Transformation Feature Contract v1, **not** more equality changes in `app.js`.

## Architectural Consolidation v1 (2026-11-06)

See `ARCHITECTURAL_CONSOLIDATION_V1.md`. Equality menu/arming/preview DOM and
clipboard panel/pointer dragging have been extracted from `js/app.js` into
`js/interaction/equalityInteractionController.js` and
`js/interaction/clipboardPanelController.js`. Mathematical proposal and stale-safe
history commit deliberately remain in `app.js` pending the next bounded
consolidation. Do not reintroduce direct menu/clipboard DOM construction there.
Preserve all student-agency, mathematical correctness, identity, modularity,
offline/low-resource and future matrix/multi-window constraints.


## Browser rendering repair after Architectural Consolidation v1
See `ARCHITECTURAL_CONSOLIDATION_V1_1_BROWSER_RENDER_REPAIR.md` for the missing renderer DOM mount, exact correction, and verification limitations.

## Identity shared lifecycle migration (latest increment)

See `IDENTITY_SHARED_LIFECYCLE_MIGRATION_V1.md`. Identity insertion (+0, ×1) now uses the same source-stamped, single-use confirmation gate and detached history preparation as equality function application. The mathematical rule and visual gesture remain unchanged. This is not yet a migration of other transformations. The user-facing priority remains student agency, mathematical correctness, stable node IDs, accessible offline use, and maintainable modular boundaries.


## Numerical combination shared lifecycle migration (2026-11-06)

Numerical sibling combination (+ and multiplication) now prepares a detached AST candidate and uses the same source-stamped, single-use, detached-history commit mechanism as rearrangement and the other migrated transformations. See `NUMERIC_COMBINATION_SHARED_LIFECYCLE_MIGRATION_V1.md` for ownership, invariants, tests and limits. This milestone preserves green hover feedback and immediate drop confirmation. Browser verification is pending; Node suite: 252 tests passed.
