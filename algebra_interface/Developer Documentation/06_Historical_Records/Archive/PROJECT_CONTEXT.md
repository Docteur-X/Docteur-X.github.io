# Project context — developer handover

**Updated:** 5 November 2026. This is a concise current handover; see [CURRENT_STATUS.md](CURRENT_STATUS.md) for the dated test baseline and implementation status. The [historical context archive](../Earlier_Chronicles/PROJECT_CONTEXT_DEVELOPMENT_CHRONICLE.md) preserves earlier decisions and design discussions.

## Purpose

Build an **offline-capable visual mathematical manipulator** for teaching, not an automatic answer generator. Students should see *what changes and why*: stable gestures propose a transformation, a deliberate preview explains it, and confirmation commits the mathematical result. Pedagogical clarity comes before performance metrics, while low-end hardware and maintainability remain design goals.

## How to run

From the project root, run `python -m http.server 8000` (Windows: `py -m http.server 8000` or `start-local-server.bat`) and open `http://localhost:8000/`. Do not launch `index.html` with `file://`. Run `npm test` or `node --test tests/*.test.js` with Node.js. No dependency installation is required for the application.

## System boundaries

- **Mathematical Model:** typed mathematical AST with occurrence IDs; expression trees and binary equality statements.
- **Mathematical Engine:** operator definitions, validity checks, evaluation and pure mathematical transformations; never depends on pointer coordinates or CSS.
- **Teaching Policy:** educational restrictions independent of mathematical validity (for example, factorisation's visible-bracket requirement).
- **Mathematical Manipulator:** gesture interpretation, coordination, rendering and explanatory previews; temporary drag/hover state must not change the committed AST.
- **History and Provenance:** per-object branching snapshots, versioned events and deterministic patches; only committed mathematical actions enter mathematical history. Document-level organisational history is a future separate concern.
- **Documents and Workspaces:** Documents contain multiple independent Mathematical Objects (each with its own root and history); the Workspace manages Documents, IndexedDB persistence and JSON import/export. Cross-object operations remain future work.

See [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) for module locations and an end-to-end transformation example; [TERMINOLOGY.md](TERMINOLOGY.md) defines the names precisely.

## Invariants to protect

1. Preserve existing node IDs for unchanged mathematical occurrences; allocate fresh IDs for genuinely new occurrences and record provenance.
2. Never mutate the committed mathematical tree during dragging or preview; confirmation is the history boundary.
3. Keep hit-testing geometry stable during pointer movement; animation and overlays must not move target regions unexpectedly.
4. Do not infer mathematical validity from a gesture, a hitbox, or a rendering detail.
5. Respect noncommutative/nonassociative operations; grouping requires eligible adjacent siblings and factorisation respects left/right factor order.
6. Keep document histories independent; a window or a selection is not the document itself.
7. Maintain backwards-compatible saved data when evolving schemas; validate imports before trusting their mathematical structure.
8. Comment *why* a non-obvious implementation exists, and update the relevant guide whenever a feature's behaviour changes.

## Current state and next work

For implemented features, browser-verified behaviour, and known limitations, use [CURRENT_STATUS.md](CURRENT_STATUS.md) as the **single authoritative status summary**. In particular, compact **document** exports are still planned even though event-only history export exists in the history module. The next work is compact-history compatibility with multi-object documents and copying expressions/objects, then equality operations on both sides and substitution; see [FUTURE_FEATURES.md](FUTURE_FEATURES.md).

## Handover workflow

Start with the root [README](../README.md), then [CURRENT_STATUS](CURRENT_STATUS.md), this page, [ARCHITECTURE_OVERVIEW](ARCHITECTURE_OVERVIEW.md), and [ARCHITECTURE_DECISIONS](ARCHITECTURE_DECISIONS.md). Read the specific feature guide only when changing that subsystem. Historical notes explain past decisions but are not authoritative descriptions of present code. Run the tests and verify browser interactions after changes.
