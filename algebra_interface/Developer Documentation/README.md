# Developer Documentation

This directory is the handover and technical reference for the offline visual mathematical manipulator. **Current behaviour is defined by source code and tests; [CURRENT_STATUS.md](CURRENT_STATUS.md) is the dated status summary.** Older guides may contain historical proposals, not current functionality.

## Start here (recommended reading order)

1. [Root README](../README.md) — run the project.
2. [CURRENT_STATUS.md](CURRENT_STATUS.md) — implemented features, verification and known limitations.
3. [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — educational purpose, invariants and handover principles.
4. [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) — six systems, module ownership and transformation lifecycle.
5. [TERMINOLOGY.md](TERMINOLOGY.md) — agreed vocabulary.
6. [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) — design rationale and trade-offs.

## Feature and subsystem guides

| Area | Reference |
| --- | --- |
| Gesture, hit-testing and stable geometry | [INTERACTION_ARCHITECTURE.md](INTERACTION_ARCHITECTURE.md) |
| Transformation previews | [TRANSFORMATION_PREVIEW.md](TRANSFORMATION_PREVIEW.md) |
| Rearrangement animation | [REARRANGEMENT_TRANSITIONS.md](REARRANGEMENT_TRANSITIONS.md) |
| Range grouping | [RANGE_GROUPING.md](RANGE_GROUPING.md) |
| Distribution | [DISTRIBUTION_IMPLEMENTATION_GUIDE.md](DISTRIBUTION_IMPLEMENTATION_GUIDE.md) |
| Factorisation | [FACTORISATION.md](FACTORISATION.md) |
| Equality | [EQUALITY_V1.md](EQUALITY_V1.md) |
| Identity toolbar | [IDENTITY_TOOLBAR.md](IDENTITY_TOOLBAR.md) |
| Hitbox visibility | [HITBOX_VISIBILITY.md](HITBOX_VISIBILITY.md) |
| History/event sourcing | [EVENT_SOURCED_HISTORY.md](EVENT_SOURCED_HISTORY.md) |
| Documents and persistence | [WORKSPACE_V1.md](WORKSPACE_V1.md) |
| Deferred capabilities | [FUTURE_FEATURES.md](FUTURE_FEATURES.md) |

## Historical material

- [Original development README](Historical%20Notes/README_DEVELOPMENT_CHRONICLE.md)
- [Full historical project-context notes](Historical%20Notes/PROJECT_CONTEXT_DEVELOPMENT_CHRONICLE.md)

Historical documents preserve the reasoning behind previous decisions; they are **not** current implementation specifications.

## Maintenance convention

- Update **CURRENT_STATUS.md** when implementation or verification changes. Keep changing test counts there rather than repeating them in every guide.
- Update the **specific feature guide** when behaviour changes, and **ARCHITECTURE_DECISIONS.md** when the architectural rationale changes.
- Update **PROJECT_CONTEXT.md** only for enduring goals, invariants or handover guidance; use **FUTURE_FEATURES.md** for deferred ideas.
- Verify relative links and run `npm test` after releases. Document browser checks separately from automated test results.
- Keep comments brief, accurate and useful for future maintainers; preserve pedagogy-first design.

**Selection note:** Persistent single selection and click-outside clearing of multiple selection are current intentional behaviours. Configurable single-selection dismissal remains a future interaction preference, not a mathematical rule.

## Documentation review checklist

Before each release, compare [CURRENT_STATUS.md](CURRENT_STATUS.md) with actual source and tests; verify links and file paths; distinguish unit-test results from browser checks; update only affected feature guides; and keep proposals clearly labelled. Preserve dated design discussions in Historical Notes rather than silently rewriting history.
