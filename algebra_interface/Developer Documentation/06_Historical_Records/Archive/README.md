> **Latest architecture increment:** [Transformation Infrastructure Consolidation v3](TRANSFORMATION_INFRASTRUCTURE_CONSOLIDATION_V3.md) — unified publication, numeric registry integration and candidate stages. Node tests: 256 passed; browser tests pending.

> **Latest migration:** [Grouping Shared Lifecycle Migration v1](GROUPING_SHARED_LIFECYCLE_MIGRATION_V1.md) (2026-11-06). Node suite: 244 passed; browser suite: 32 pending verification.

> **Starting a new development chat?** Read [AI Development Handover](AI_DEVELOPMENT_HANDOVER.md) first, then [Current Status](CURRENT_STATUS.md).

# Developer Documentation

This directory is the handover and technical reference for the offline visual mathematical manipulator. **Current behaviour is defined by source code and tests; [CURRENT_STATUS.md](CURRENT_STATUS.md) is the dated status summary.** Older guides may contain historical proposals, not current functionality.

**Founding purpose:** [Student agency and mathematical reasoning](FOUNDING_VISION_STUDENT_AGENCY.md) — enduring product vision and architectural implications.

## Start here (recommended reading order)

1. [Root README](../README.md) — run the project.
2. [CURRENT_STATUS.md](CURRENT_STATUS.md) — implemented features, verification and known limitations.
3. [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — educational purpose, invariants and handover principles.
4. [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) — six systems, module ownership and transformation lifecycle.
5. [TERMINOLOGY.md](TERMINOLOGY.md) — agreed vocabulary.
6. [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) — design rationale and trade-offs.

## Architectural principles and roadmap

| Read | Why |
| --- | --- |
| [Pedagogical vision](PEDAGOGICAL_VISION.md) | Educational purpose, explicit instruction, reversible explanatory depth and teaching-site goals |
| [Transformation Features](TRANSFORMATION_FEATURES_AND_EXPLANATION_DEPTH.md) | Conceptual grouping of rule, gesture, feedback, visualisation and confirmation |
| [Transformation Feature Contract v1](TRANSFORMATION_FEATURE_CONTRACT_V1.md) | Implemented contract, equality migration, scope and handover |
| [Registry v1](TRANSFORMATION_FEATURE_REGISTRY_V1.md) | The actual implemented feature registry and its limits |
| [History semantics and replay](HISTORY_SEMANTICS_AND_REPLAY.md) | Mathematical versus document events, navigation, replay and provenance |
| [Annotations and inspection](ANNOTATIONS_AND_INSPECTION.md) | Future non-mathematical teaching overlays and inspect mode |
| [Future features](FUTURE_FEATURES.md) | Deferred features and prerequisites |

- [Equality Function Application v1.3.1 amber glow](EQUALITY_FUNCTION_APPLICATION_V1_3_1_AMBER_GLOW.md) — shared distribution/equality insertion styling and browser QA.

## Feature and subsystem guides

| Area | Reference |
| --- | --- |
| Manipulator architecture | [MANIPULATOR_ARCHITECTURE_V1.md](MANIPULATOR_ARCHITECTURE_V1.md) |
| Gesture, hit-testing and stable geometry | [INTERACTION_ARCHITECTURE.md](INTERACTION_ARCHITECTURE.md) |
| Previews and rearrangement | [TRANSFORMATION_PREVIEW.md](TRANSFORMATION_PREVIEW.md), [REARRANGEMENT_TRANSITIONS.md](REARRANGEMENT_TRANSITIONS.md) |
| Range grouping | [RANGE_GROUPING.md](RANGE_GROUPING.md), [migration](GROUPING_ARCHITECTURE_MIGRATION.md) |
| Distribution | [DISTRIBUTION_IMPLEMENTATION_GUIDE.md](DISTRIBUTION_IMPLEMENTATION_GUIDE.md), [shared lifecycle migration](DISTRIBUTION_SHARED_LIFECYCLE_MIGRATION_V1.md) |
| Factorisation | [FACTORISATION.md](FACTORISATION.md), [migration](FACTORISATION_ARCHITECTURE_MIGRATION.md), [shared commit lifecycle](FACTORISATION_SHARED_LIFECYCLE_MIGRATION_V1.md) |
| Rearrangement migration | [REARRANGEMENT_ARCHITECTURE_MIGRATION.md](REARRANGEMENT_ARCHITECTURE_MIGRATION.md) |
| Equality and identities | [EQUALITY_V1.md](EQUALITY_V1.md), [IDENTITY_TOOLBAR.md](IDENTITY_TOOLBAR.md) |
| Hitbox visibility | [HITBOX_VISIBILITY.md](HITBOX_VISIBILITY.md) |
| History/event sourcing | [EVENT_SOURCED_HISTORY.md](EVENT_SOURCED_HISTORY.md) |
| Documents and persistence | [WORKSPACE_V1.md](WORKSPACE_V1.md), [MULTI_OBJECT_DOCUMENTS_V2.md](MULTI_OBJECT_DOCUMENTS_V2.md) |

## Historical material

- [Original development README](../Earlier_Chronicles/README_DEVELOPMENT_CHRONICLE.md)
- [Full historical project context](../Earlier_Chronicles/PROJECT_CONTEXT_DEVELOPMENT_CHRONICLE.md)

Historical notes explain why decisions were explored; they are **not** current implementation specifications.

## Documentation maintenance

1. Check source and run `node --test tests/*.test.js` before updating [CURRENT_STATUS.md](CURRENT_STATUS.md); distinguish automated results from browser observations.
2. Update the affected feature guide for implementation changes, [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) for accepted design rationale, and [FUTURE_FEATURES.md](FUTURE_FEATURES.md) for deferred proposals.
3. Do not describe a proposed architecture as implemented, or preserve stale implementation status in an active guide without an explicit historical label.
4. Keep comments concise and explain non-obvious *why*, preserve stable mathematical IDs, and treat pedagogical clarity as a functional requirement.
5. Verify relative links, source paths, schema compatibility, and real-browser interactions after structural changes.

**Selection policy:** Persistent single selection and click-outside clearing of multiple selection are intentional current behaviours. Configurable single-selection dismissal is a future interaction preference, not a mathematical rule.

- [Application Controller Consolidation v1](APPLICATION_CONTROLLER_CONSOLIDATION_V1.md) — module ownership, integration boundaries, browser regression checklist, and team handover.

### Browser regression tests

- [Playwright Browser Testing v1](PLAYWRIGHT_BROWSER_TESTING_V1.md) — setup, current E2E coverage, CI, and contributor checklist.
- [Playwright Architecture v2](PLAYWRIGHT_ARCHITECTURE_V2.md) — semantic window identifiers, page objects, viewport-safe pointer gestures, and current verification limitations.

- [Playwright Interaction Coverage v3](PLAYWRIGHT_INTERACTION_COVERAGE_V3.md) — four additional browser scenarios and lockfile guidance.

- [Test Reliability and Correctness Audit v1](TEST_RELIABILITY_CORRECTNESS_AUDIT_V1.md) — exact mathematical browser oracles, mutation probe, and outstanding verification.

- [Equality Function Application v1.3.2 — Visual and Grouping Corrections](EQUALITY_FUNCTION_APPLICATION_V1_3_2_VISUAL_GROUPING.md)

- [Architectural Consolidation v1](ARCHITECTURAL_CONSOLIDATION_V1.md) — extracted equality and clipboard UI controllers, ownership boundaries, verification and handover.

- [Architectural Consolidation v2](ARCHITECTURAL_CONSOLIDATION_V2.md) — first shared stale-safe, single-use proposal/commit gate; equality migration and limits.

- **Identity shared lifecycle migration:** `IDENTITY_SHARED_LIFECYCLE_MIGRATION_V1.md` — latest focused migration of +0/×1 into the stale-safe, atomic-preparation confirmation path; scope, invariants, tests and handover.
