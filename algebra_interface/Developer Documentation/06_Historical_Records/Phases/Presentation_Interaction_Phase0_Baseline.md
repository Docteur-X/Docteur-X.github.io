# Presentation and Interaction Consolidation — Phase 0 Baseline

**Status:** Node-characterized; browser rerun pending. **Source:** Mathematical Structure Navigation v1 / Consolidation Master Plan v1. **Scope:** Read-only application behaviour; three additional characterization tests only.

## What is authoritative?

- The AST and mathematical document are mathematical authority. `js/rendering/domRenderer.js` receives the AST root and presentation options; it does not validate rule applicability.
- `js/rendering/semanticContainerMap.js` enumerates AST occurrences and describes current DOM representations. Content-only operations are *not* silently promoted to hitboxes.
- `js/interaction/hitTesting.js` snapshots geometry for pointer targeting. `js/interaction/structureNavigation.js` follows AST ancestry; `structureNavigator.js` currently looks up DOM targets independently and paints `is-structure-navigated` directly.
- `js/interaction/visualFeedbackController.js` owns some transient semantic roles. `hitboxVisibility.js` and `negationInlinePreview.js` use it; other specialized visual paths remain.
- `js/app.js` composes input, drag arbitration, selection, previews, workspace and rendering. `js/manipulator/previewCoordinator.js` manages proposal validity by revision; `atomicTransformationCommit.js` prepares changes and `transformationPublication.js` publishes prepared state.
- Mathematical history is not a place for navigation focus, visual feedback or future proxy palette state. Window/view slots are non-AST structures, still future design.

## Phase 0 characterization coverage

New `tests/presentation-phase0-characterization.test.js` verifies (1) natural-root nested Group ancestry, (2) content-only Add versus independently targetable Symbol mapping, and (3) a single feedback owner's show/replace/clear behaviour and invalid-descriptor safety. These tests deliberately do not assert that the current overlapping-owner bug is acceptable.

Existing browser regression families to preserve during Phases 1–5: nested-hitbox interaction and contract; AST root semantics; distribution and shared lifecycle; negation compression and amber/green feedback; equality; grouping; history navigation; compact import/export; persistence. Existing Node suites cover the engine, atomic publication and serialization. Browser testing is **pending** in this execution environment; user reported the pre-Phase-0 baseline passed.

## Verification and reproducibility

- Before modification: `node --test tests/*.test.js`: **289/289 passed**.
- After adding three characterization tests: `node --test tests/*.test.js`: **292/292 passed**.
- Node runtime: **v22.16.0**. `npm` is unavailable here; Playwright **not run**. Do not claim browser verification of this archive.
- Test command when npm is available: `npm test && npm run test:e2e`.
- Source archive: `Manipulator_Consolidation_Master_Plan_v1_Complete_Project.zip`. For a permanent Git baseline, commit and tag the last verified release in the user's repository; no Git commit/tag was created here.

## Known unknowns and risks before Phase 1

1. `visualFeedbackController.js` clears CSS classes per owner, not per effective role. If two owners apply the same class to one target, clearing one may remove the other's feedback. This is a **source-grounded risk**, not yet a demonstrated browser failure. Phase 1 should introduce a failing regression before changing it.
2. `structureNavigator.js` directly toggles `is-structure-navigated` and independently resolves targets. Phase 1 migrates its transient highlight; Phase 2 owns target resolution. Avoid combining both migrations in one large diff.
3. CSS specificity, `!important` and multiple preview implementations may affect feedback priority. Preserve current visuals until computed-style tests characterize them.
4. Repeated DOM scans and full-history cloning are performance hypotheses; benchmark rather than optimize speculatively.
5. Existing authoritative status and handover contain old dated snapshots. Maintain a concise current header and avoid treating historical paragraphs as present verification.

## Phase 0 exit gate

**Node baseline and source ownership map: complete. Browser verification: pending.** Phase 1 should begin only after the owner confirms this archive's browser suite is green (or the failure is investigated). No production JavaScript, CSS, mathematical rules, history or persistence schemas changed in Phase 0.
