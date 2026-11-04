# Current implementation status

**Verified:** 4 November 2026 against the source in this archive. `node --test tests/*.test.js`: **143 passed, 0 failed**. This count is a dated verification, not a permanent assertion; rerun tests after code changes.

## Implemented

- Mathematical AST: scalar arithmetic expression nodes and a binary `Equal` statement; explicit Group brackets and operator-controlled associativity/commutativity.
- Rules: rearrangement, arithmetic evaluation, range grouping, distribution (including under `Equal`), left/right factorisation, symmetry, and identity introduction (`+0`, `×1`).
- Interaction: stable hit testing, deliberate transformation previews, persistent single selection, Ctrl/Cmd multi-selection, hover-only/visible hitboxes, amber identity toolbar drag feedback.
- Documents/workspace: create, rename, duplicate, open, close, delete and switch; per-document history; IndexedDB save/autosave; JSON import/export.
- History: branching snapshots, versioned events, deterministic patches, event-only history-library export/replay; normal workspace exports still include snapshots.

## Verified by project owner in browser

Workspace creation/switching, document independence, reload persistence, JSON import/export, Close behaviour, identity toolbar hover behaviour, distribution inside equations. These are informal manual checks, not automated end-to-end coverage.

## Important deferred work

- Compact **document** export/import integration and round-trip validation; deep imported-AST/history validation.
- Cross-document selection, equality substitution, operations on both sides, simultaneous manipulators and logical connectors.
- Incremental free-edit UI, numerical decomposition, matrices/fractions/powers/roots and richer type system.
- Broader real-browser pointer, accessibility, storage failure and performance regression tests.

## Ownership and navigation

`js/app.js` still coordinates substantial UI/interaction state. `js/core/documentController.js`, `documentHistory.js`, `documentRepository.js` and `workspaceDocuments.js` own document/history/persistence responsibilities; mathematical rules live in `js/operations/` and `js/relations/`. See [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) for the module map, [TERMINOLOGY.md](TERMINOLOGY.md) for naming, and [FUTURE_FEATURES.md](FUTURE_FEATURES.md) for the roadmap. Dated design guides may retain historical wording; this page and current source take precedence for present capability.
