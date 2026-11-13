# Phases 1–4 retrospective — audit execution plan

**Date:** 8 November 2026. **Baseline:** Phase 4F, owner-reported 72/72 browser tests, independently rerun 387/387 Node tests. **Scope:** verification and prioritization, not automatic production refactoring.

## Method and evidence standard

1. Freeze the Phase 4F archive and record its exact source and test baseline. Distinguish owner-reported browser runs from independently executed tests.
2. Trace the actual call graph and lifecycle in `js/app.js`, rather than treating phase documentation as authoritative. Build an ownership table for each shared subsystem and its feature-specific callers.
3. Phase 1: inspect all feedback-controller handles, union/hint semantics, detached-node cleanup, remaining direct DOM class writers and visual precedence. Distinguish specialized preview styling from genuinely duplicated semantic feedback.
4. Phase 2: verify renderer-emitted IDs, roles and 1-based operator indices; trace resolver consumers, nested/group targets, rerender invalidation, Mathematical Object switching and view isolation. Distinguish semantic lookup from geometric hit testing.
5. Phase 3: trace every gesture adapter through eligibility, intent arbitration, preview selection, source stamps and commit authorization. Check owner capability restrictions, ambiguity, cancellation and exactly-once publication.
6. Phase 4: inventory all six modal lease holders and non-modal animations; audit cancel, confirm, failed confirmation, expression rebuild, history restore, object/document switch, rerender and exceptional cleanup. Verify lease and feature state agree after each transition.
7. Cross-cutting: inspect local import graph and dependency direction, stable AST IDs, atomic publication, test oracles, browser synchronization and historical documentation drift.
8. Classify every finding as **confirmed defect**, **contract weakness**, **test gap**, **documentation debt**, or **intentional design**. Require a reproducible failure or clear source path before production changes.
9. Produce a prioritized report and Phase 5 extraction candidates. Do not claim visual or multi-view coverage without a browser run that establishes it.

## Acceptance gates before Phase 5

- All currently verified suites remain green after any patch; no mathematical rule changes are bundled with composition refactors.
- High-priority confirmed defects have focused regression tests and owner browser verification.
- A representative real-browser cross-family modal conflict and post-cancel reacquisition test are available.
- A targeted fault-injection check verifies ownership release when feature cleanup fails; document limits of visual recovery.
- Authoritative handover and status documents agree with source and test evidence.
- Phase 5 extracts stable, demonstrably cohesive responsibilities only; no universal controller or premature teaching-policy framework.

**Status:** Initial source-level retrospective completed; targeted browser conflict and fault-injection follow-up remains pending. See `Phases1_to_4_Retrospective_Findings.md`.
