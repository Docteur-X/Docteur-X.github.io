# Application Controller Consolidation v1 — developer handover

Status: implemented, automated tests 171/171; real-browser regression pending.

## Purpose and scope

This is a behaviour-preserving consolidation of the browser application composition layer, **not** a rewrite of the mathematical engine, history, gesture algorithms, or renderer. The original `app.js` grew to 2,484 lines and combined application wiring with feature registration, UI selectors, navigation rendering and presentation preferences. These separable responsibilities now have explicit module owners.

## Ownership boundaries

| Module | Owns | Must not own |
| --- | --- | --- |
| `js/composition/transformationFeatureAssembly.js` | Seven stable transformation registrations; validation adapters for Engine proposals | DOM, pointer geometry, history commits |
| `js/ui/domBindings.js` | Named DOM selector map for the standalone website | Mathematical AST, rule decisions |
| `js/ui/workspaceNavigation.js` | Rendering document and object navigation; active/disabled controls | Document mutation, persistence, mathematical transformations |
| `js/ui/presentationPreferences.js` | Theme and multiplication display preference handling | Mathematical transformations, history |
| `js/app.js` | Browser lifecycle, wiring, active Manipulator, interaction coordination | New mathematical rule implementations |
| `js/manipulator/*` | Gesture requests, coordinator, preview lifecycle, visual semantics | Document persistence |
| `js/core/*` and `js/operations/*` | Mathematical state, document history and rules | Browser UI and animations |

**Dependency rule:** Engine and document model modules must never import browser UI modules. Feature assembly is an outer-layer composition root and may import Engine proposal functions and Manipulator adapters. UI navigation receives data and updates DOM; it never modifies mathematical state.

## Why the refactor is incremental

Rearrangement's animation scheduling and hit-testing geometry are sensitive to DOM lifecycle. Distribution and factorisation also have carefully tested modal previews. Moving these into new controllers purely to reduce line count risks reintroducing known bugs. Their current paths are preserved. `app.js` remains substantial (approximately 2,318 lines), so this release is an **initial extraction**, not a completed full-controller rewrite.

## Contracts and testing

- `createApplicationTransformationFeatures()` returns the seven registered rule IDs with unchanged Engine/gesture/visual functions and confirmation policies.
- `queryApplicationDom(root)` is the single selector map. Embedded hosts may eventually supply their own element map.
- `renderWorkspaceNavigation(dom, documents, activeId, dirty, activeDocument)` is a presentation-only operation. It calls `renderObjectNavigation`.
- `normaliseMultiplicationMode`, `readSavedTheme`, and `applyThemePreference` isolate preference behaviour and tolerate unavailable storage.
- `tests/applicationComposition.test.js` protects registration, theme fallback, and empty/active workspace UI.

## Required browser regression checklist

1. Open, close, rename, switch and reload documents and mathematical objects; verify independent history.
2. Confirm `+0` and `×1` floating drag, stationary hover and post-drop preview.
3. Confirm distribution, including within both sides of equality.
4. Confirm grouping of an entire equation side renders brackets immediately.
5. Confirm factorisation preview arrows, teaching policy and cancellation.
6. Rapidly rearrange `a+b+c` and `abc`; ensure stable hitboxes and **no second animation** after drop.
7. Verify light/dark mode, hitbox visibility, multiplication display options and history restoration.
8. Verify export/import and browser-local persistence. Compact history export remains a separate integration concern.

## Guidance for multiple contributors

- Engine contributors should work in `core`, `operations`, `relations` and `teaching` without importing UI code.
- Manipulator contributors should own `manipulator` and `interaction`, retaining non-mutating previews and explicit commits.
- UI contributors should own `ui`, `rendering` and stylesheet changes, but not mathematical validity.
- Document/history contributors should own persistence and versioned schemas, not gesture behaviour.
- Integration contributors own `app.js` and `composition`, coordinate cross-layer changes, and verify browser behaviour.

Do not assume that a passing Node test suite proves pointer or animation correctness. Preserve brief, precise comments explaining invariants and non-obvious decisions. Update `CURRENT_STATUS.md`, the relevant subsystem guide and this handover when contracts change.

## Next extraction candidates (not implemented)

- Workspace persistence/activation coordination behind an explicit controller interface.
- Shared preview-cancellation orchestration during document/object/history switching.
- Event-listener binding in testable browser controllers, without duplicating mathematical state.
- Narrowing `app.js` to application startup and dependency wiring **after** browser regression coverage is adequate.

## Regression correction (2026-11-05)

The initial consolidation release accidentally removed direct imports of eight gesture/visual adapters from `app.js` when their registry registrations moved into `transformationFeatureAssembly.js`. The registry's own imports do **not** make those names available to the still-existing browser event handlers. This caused `ReferenceError` failures on drop or preview entry across all five interaction families, despite the earlier 171 passing unit tests.

The direct imports have been restored. `tests/application-live-adapter-imports.test.js` protects this transitional dependency. The suite now passes 172/172 tests. **Real-browser verification of the repaired release is still required.** Future extraction should remove these imports only when the live handlers have been changed to obtain the adapters through the coordinator/registry, with browser integration coverage.
