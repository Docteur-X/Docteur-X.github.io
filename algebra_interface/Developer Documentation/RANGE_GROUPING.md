# Range grouping and persistent multi-selection

**Implemented:** 2 November 2026  
**Status:** Model and interaction modules implemented; automated tests pass. Real-browser pointer, focus, line-wrap, and visual testing remains necessary.

## 1. What the student does

1. Ctrl+click (Windows/Linux) or Cmd+click (macOS) any mathematical hitbox to add/remove it from a persistent selection. The key may be released between clicks. Clicking an ordinary term without a modifier returns to ordinary single selection/dragging; clicking elsewhere clears the multi-selection.
2. Selection never changes the expression's order, layout, mathematical tree, or history. Selected hitboxes receive a thin blue outline. Nonadjacent or cross-parent selections are perfectly valid selections, but cannot be *range grouped*.
3. If at least two selected nodes are consecutive siblings under the same associative `Add` or `Multiply` parent, a thin blue dashed envelope appears around the range. Its **border** has a larger invisible click target; its centre remains click-through to preserve existing drag interactions.
4. Click the envelope border or the **Preview grouping** toolbar action to enter a lightweight modal preview. The proposed brackets and a more prominent blue envelope appear. Ordinary drag operations are temporarily locked. Changing the bracket style in the toolbar updates the preview without changing the mathematical tree.
5. Click the preview envelope/brackets or **Confirm grouping** to commit. Click elsewhere, choose **Cancel**, or press Escape to cancel while keeping the original selection. Escape again clears the selection.
6. Committing creates exactly one history entry and preserves all original operand IDs. After commit the new explicit `Group` is selected, and its brackets can be removed with the existing toolbar action.

## 2. Division of labour

| File | Responsibility |
|---|---|
| `js/interaction/selection.js` | Persistent selection of arbitrary node IDs; prevents simultaneous ancestor/descendant selection. No mathematical or DOM knowledge. |
| `js/operations/grouping.js` | Pure range eligibility and atomic tree transformation. Asks the addition/multiplication rule modules about associativity. Preserves existing IDs and reports created IDs. |
| `js/interaction/groupingPreview.js` | Measures selected DOM hitboxes, draws fixed-position non-layout-changing envelopes, supplies border activation and modal confirmation controls. No mathematical tree mutations. |
| `js/app.js` | Coordinates Ctrl/Cmd+click, modal state, preview confirmation/cancellation, history and toolbar. Locks conflicting gestures during preview. |
| `js/rendering/domRenderer.js` | Continues to render only actual expression-tree nodes, including the committed `Group`. No preview logic was added here. |
| `js/interaction/hitTesting.js` / `dragFeedback.js` | Existing stable drag geometry and evaluation/distribution feedback, deliberately unchanged. |
| `styles.css` | Thin blue selection outlines and fixed-position grouping overlays. |

## 3. Mathematical invariants

- **Selection is not an operation.** Selecting `a` and `c` in `a+b+c` is allowed, but doesn't justify silently reordering or grouping them.
- **Only adjacent siblings may be range grouped.** `a` inside `ab` and `c` inside `ac` are not siblings, and cannot be grouped through this rule. Such cross-product selection will later be useful for factorisation.
- **Associativity is a permission, not a rendering guess.** `getRangeGroupingPlan` calls `isAdditionAssociative()` or `isMultiplicationAssociative()`. When false, range grouping is unavailable. Single-subtree `wrapNodeInGroup` remains a separate operation.
- **Explicit groups stop flattening.** The rule-aware normalizer must not remove a deliberately created Group.
- **Preserve IDs.** For a proper range, create an inner operation and Group; reuse the exact existing operand objects. When the entire non-root operation is selected, wrap that existing operation rather than duplicating it. For the structural Add root, retain its root ID and create a nested Add.
- **Commit is atomic.** The plan is checked again on confirmation, then the tree is modified once, normalized, and recorded in history once. Cancel never changes IDs or history.

## 4. Why the overlay does not disturb dragging

`groupingPreview.js` measures existing selected hitboxes using `getBoundingClientRect()`, but inserts **no** new HTML elements inside `#equation`. Its fixed overlay uses `pointer-events: none` except for thin border activation strips in selection mode. This preserves the drag controller's geometry and the equation's layout. Only during modal preview is the whole proposal intentionally clickable.

A long expression may wrap. Instead of one giant rectangle covering unrelated terms, the preview creates one envelope segment per visual row. This is an initial heuristic based on vertical centre positions; it should be refined when true two-dimensional notation (fractions, matrices, exponents) arrives.

## 5. Node provenance

The grouping operation returns a `provenance` record with `parentId`, `preservedOperandIds`, `createdNodeIds`, `bracketStyle`, and rule name. This is saved on the committed history entry. Grouping doesn't copy mathematical operands, so it does not require the one-to-many mapping used by distribution.

## 6. Testing checklist

Automated: run `node --test tests/*.test.js` for the current suite (143 tests verified on 4 November 2026). Range-specific regressions are in `tests/range-grouping.test.js`.

**Browser checks required:**

- `a+b+c+d`: Ctrl+click `b`, then `c`; release Ctrl; click the thin envelope; verify preview brackets, change to square brackets, confirm, undo, redo.
- Select `a` and `c`: individual outlines remain but no grouping envelope appears; Ctrl+click `b` to make the full range eligible.
- Select a whole product and then one of its nested factors: ancestor/descendant conflict should resolve predictably.
- `a*b*c+d`: group `a` and `b`, then group all factors in a product; ensure factor IDs and product ID survive as documented.
- Enter grouping preview, press Escape; confirm the selection remains. Press Escape again; confirm it clears.
- Enter preview, click another mathematical term: preview cancels, and that click must not start an unrelated drag.
- Ordinary drag, numeric combination, amber distribution and rearrangement preview still work when not in grouping-preview mode.
- Resize, scroll, zoom, dark mode and narrow-window line wrapping: outlines should stay aligned and must not move the mathematics.
- Keyboard: Tab to **Preview grouping**, Confirm and Cancel; Enter/Space on the envelope should work.

## 7. Deliberately deferred

- Shift+click to select a continuous range.
- Multi-selection of factor occurrences as a precursor to factorisation, including noncommutative left/right common factors.
- Incremental text **Edit Expression** that preserves IDs across local text edits; rebuilding the whole input still creates a fresh tree.
- A general selection-region abstraction for fraction numerators/denominators, powers, roots and matrices.
- Advanced grouping across non-sibling terms (must use explicit mathematical rules, never this grouping action).
