# Mathematical Clipboard v2 — implementation and handover

## Student-facing contract

Copy means **remember this mathematical selection**, not paste, duplicate, or assert equality. The application keeps an ordered library of captured expression subtrees and statements. Entries are available while switching documents during one loaded application session. The library starts empty after reload; no browser storage, IndexedDB write, or document export contains it. Future optional retention must be opt-in and versioned.

The clipboard is collapsible, and students can choose the active entry, remove individual entries, or clear the library. Copying an expression does **not** create another Mathematical Object. A future `Duplicate Object` command belongs to document management, whereas a future `Apply clipboard operand to both sides` command must be a separately justified mathematical transformation.

## Code boundaries

- `js/core/mathematicalClipboard.js` captures an independent AST snapshot and provenance. Its existing `pasteMathematicalClipboard()` utility is retained for backward compatibility but is **not invoked by the v2 user interface**.
- `js/core/clipboardLibrary.js` manages the ordered, session-owned collection, active entry, and removal. It is DOM-free, has no dependency on the workspace or persistence layer, and does not mutate inputs.
- `js/app.js` owns the session instance and projects its entries into `#clipboardEntries`. Rendering uses `textContent`, not injected HTML. No transformation rule, mathematical history, or document state is changed by copying.
- `index.html` contains the collapsible clipboard and disclosure-based presentation settings, symbol table, document/object navigation, and interaction help. This is an incremental organization pass, **not** the future multi-window system.

## Mathematical and architectural invariants

1. Clipboard content is a snapshot of the selected node, including explicit grouping and statement structure; it does not track subsequent source edits.
2. Provenance identifies the source document, object, and node when available; provenance is not a mathematical proof.
3. The clipboard belongs to the application session, not a document; switching documents does not clear it.
4. Clipboard selection/removal and collapsing panels are presentation/session actions, not mathematical history events.
5. When a future operation inserts a clipboard subtree into a destination AST, it must allocate **new occurrence IDs**, validate types and shapes, and check operation direction (especially for noncommutative matrices).
6. Source documents remain independent and can be saved/exported without serializing the transient clipboard.

## Testing and verification

Run `node --test tests/*.test.js`, `npm run test:e2e`, and `npm run test:mutation`. `tests/clipboard-library.test.js` tests cross-document snapshots, active selection, deletion, source immutability and clearing. `e2e/mathematical-clipboard.spec.js` tests the user-visible non-destructive copy workflow. Other browser tests guard existing algebra gestures, history and persistence. Browser verification must be completed in an environment with Playwright Chromium installed.

## Future direction — intentionally not implemented

The worksheet/document contains multiple independent Mathematical Objects. Windows will be multiple configurable views into objects, with one editing view per object, snapping and deferred rendering. A separate Annotation Layer will support freeform marks and AST-anchored circles, braces and descriptions. Logical connectors, relations, vectors, matrices, graphs, and cross-object equality-preserving operations remain architectural goals. Clipboard v2 intentionally does not implement pasting, operand application, window management, or annotation.

## Follow-up notes

A future UI consolidation may move document/object navigation into side panels and use a settings menu. The current disclosure panels are deliberately minimal to preserve existing selectors and behaviour. Review the `expressionHelp` and display-mode settings when adding new notation, rather than mixing presentation choices into the mathematical AST.
