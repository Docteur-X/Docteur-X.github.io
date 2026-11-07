# Rearrangement architecture migration (2026-11-05)

## Status

Implemented for pointer and keyboard rearrangement of direct Add/Multiply siblings. Automated baseline: **164 passing tests**. Browser verification is still required for fast pointer movements, implicit multiplication, nested equations, and no duplicate post-drop motion.

## Responsibilities

- `js/manipulator/rearrangementGesture.js`: validates the *shape* of an insertion-slot gesture and produces a frozen, DOM-independent action request. Indices are measured **after removing the dragged operand**.
- `js/manipulator/rearrangementRule.js`: read-only candidate/visual ordering using existing `canReorderAddend` / `canReorderFactor` rules; commit delegates to existing Engine reorder operations and rechecks the live tree.
- `js/manipulator/rearrangementVisual.js`: semantic description of the source, destination and prospective order. It does not paint or animate.
- `js/manipulator/transformationCoordinator.js`: dispatches requests to the registered Engine adapter, with `confirmationMode: immediate`.
- `js/interaction/hitTesting.js`, `dragFeedback.js`, `rearrangementPreview.js`: retain established stable pointer geometry, inert preview DOM, transition ownership and animation scheduling.
- `js/app.js`: wires the modules to existing pointer and keyboard handlers; commits history only after a successful change. Pointer commits still use `renderApplication(false)` to avoid replaying a second FLIP animation.

## Invariants

1. Hover/candidate construction never mutates the committed AST, and source node IDs are retained on commit.
2. Only the Engine authorises commutative rearrangement. Noncommutative Add/Multiply settings reject rearrangement.
3. The source and destination must belong to the same direct Add/Multiply parent; no implicit flattening or reassociation occurs.
4. Stable drag geometry is independent of the moving visual preview. Never remeasure an animating clone as the authoritative drop target.
5. A failed or cancelled drop does not commit history; successful pointer drops do not animate the same rearrangement twice.
6. The semantic visual descriptor does not own DOM, colour tokens, or the mathematical rule.

## Future work

The current implementation still coordinates pointer state in `app.js`. Extracting a general Gesture Resolver and Visual Feedback Controller should be incremental, preserving this tested geometry and animation implementation. Revalidate live parent and node IDs on commit when extending to multiple simultaneously active Manipulators.
