> **Latest implementation:** Workspace Import and Autosave Lifecycle Correction v1. Save completion status is gated by active-document identity and operation generation; pending autosaves capture their document snapshot at scheduling time. `js/workspace/workspaceStatusGate.js` and [workspace lifecycle guide](Workspace_Import_Autosave_Lifecycle.md) explain the boundary. Node tests 270/270 passed; browser/CI verification pending. Keep v1.2.3 as user-verified rollback baseline.

# Current AI/developer handover — Negation v1.2.3

**Read first:** [Student agency](../01_Founding_Vision/Student_Agency.md), [Current status](../05_Roadmap/Current_Status.md), [System architecture](../02_Architecture/System_Overview.md), [Transformation framework](../02_Architecture/Transformation_Framework.md), and [Design-first workflow](Design_First_Development_Workflow.md). Source code and executable tests supersede stale narrative claims; historical records are not the current specification.

**Purpose:** The student chooses mathematical transformations and reasoning depth; the Mathematical Engine enforces justified rules, while the interface makes structure and provenance visible. Preserve stable node identities, offline/low-end compatibility, mathematical correctness, maintainability and future vector/matrix extensibility.

**Verified baseline:** Owner reports Negation v1.2.3 passing Node and browser suites, with working negation interactions and green compression feedback. Node result: **268/268 passed**. This subsequent documentation-only update has not changed application behaviour.

**Relevant implementation:** `js/core/parser.js`, `js/core/operatorMetadata.js`, `js/operations/negation.js`, `js/manipulator/negationVisual.js`, `js/interaction/negationInlinePreview.js`, `js/interaction/negationCompressionTarget.js`, `js/interaction/visualFeedbackController.js`, `js/interaction/dragFeedback.js`, and the registered transformation assembly. The semantic visual adapter supplies *both* expansion and compression copy. The renderer owns notation/hitboxes, feedback owns styling, gesture arbitration owns intention, the engine owns mathematical rules, and the shared commit lifecycle owns publication/history safety. Do not scatter new CSS or commit handlers across features.

**Current tests:** `tests/negation-contract-roundtrip.test.js`, `tests/negation-subtraction-v1.test.js`, `tests/negation-compression-v12.test.js`, `e2e/negation-subtraction-v1.spec.js`, `e2e/negation-compression-v12.spec.js`. The new tests compare structural AST shape rather than newly allocated IDs and verify distinct preview descriptions. The browser suite must be rerun on this increment.

**Remaining concerns:** Scalar-only mathematical assumptions; hover currently builds detached compression candidates; performance needs measurement before optimization; not all visual preview families use the same generic mechanism. See [Known issues](../05_Roadmap/Known_Issues.md).

**Handover discipline:** Preserve the last verified ZIP; implement bounded changes; comment nontrivial code; update maintained references in place (not new milestone diaries); test and report exactly what ran; explain the plain-English takeaway. Historical detail is in `06_Historical_Records/Archive/`.

**Preferred language:** Student **interaction** → recognizer → interpreted **intent** → requested **mathematical rule** → engine **rule application** → result/preview → confirmation/history. Refer to [the maintained terminology](../04_Reference/Interaction_Intent_and_Rule_Application_Terminology.md); preserve actual `*Gesture.js` and `transformationCoordinator.js` names until a separately verified code migration.
