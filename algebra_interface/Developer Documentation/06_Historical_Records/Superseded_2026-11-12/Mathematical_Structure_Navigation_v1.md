# Mathematical Structure Navigation v1

**Status:** implemented; 289 Node tests passed in the packaging environment. Browser tests require verification on Windows/Playwright. The last user-verified baseline remains AST Root Semantics v1.1.

## Purpose

Students navigate *mathematical occurrences* (AST identities), not HTML wrappers. This is an interaction-access feature, not a mathematical rule application. Navigation, selection, and visual focus never create history events.

## UI and controls

The `Mathematical structure` toolbar is placed **outside** the `.equation` region so its controls do not affect mathematical layout or hitbox geometry. Parent, first child, previous sibling and next sibling buttons follow AST parent/operand order. With focus inside the equation or toolbar, `Alt+ArrowUp/Down/Left/Right` performs the corresponding navigation. The current occurrence's type, ID, and current representation are reported. `Select occurrence` delegates to the existing application selection state.

Navigation focus is separate from ordinary mathematical selection. A dashed lavender outline is applied to the best available rendered representation; it changes neither box size nor layout. For a content-only operation, the content container is highlighted and explicitly reported as `content-only`. We do **not** invent a draggable hitbox for such a node. The same principle applies to operator-only or currently unrepresented nodes. A semantic node may be selected via the toolbar even when it has no independent pointer target.

## Ownership and implementation

- `js/view/rendering/semanticContainerMap.js` inventories AST ancestry; it is not a second AST.
- `js/view/structureNavigation.js` is a pure, DOM-independent navigation function. The AST determines ancestry and sibling order.
- `js/view/structureNavigator.js` owns toolbar, keyboard access and layout-neutral focus decoration; it never applies mathematical rules.
- `js/app.js` connects `Select occurrence` to the established selection lifecycle and refreshes the navigator after rendering.
- `js/view/rendering/domRenderer.js` marks root Add/Multiply/Equal content containers as semantic content, not occurrence hitboxes, so root operations can be located without creating new drag targets.
- `css/feedback.css` defines the navigation outline. No feedback state is stored in history.

## Identity, invalidation and scope

When a rerender retains the focused node ID, navigation remains on that occurrence. If a rule application replaces the node, navigation falls back to the current root rather than guessing a provenance relationship. The navigator does not persist to the Document in v1; this is distinct from future persistent target proxies. No new AST wrapper or Mathematical Object schema is introduced.

## Deferred

Target proxies, rule-following proxy continuity, multiple independent Window Manager view slots, selection policy for content-only operations, richer geometry metadata, and advanced accessibility navigation are separate milestones. This release is not a new mathematical selection or provenance engine.

## Tests

`tests/view/structure-navigation.test.js` checks nested ancestry, sibling order, boundaries, and natural roots. `e2e/view/structure-navigation.spec.js` checks selection/history and content-only navigation. Existing browser regression suites must be rerun before treating this release as verified.
