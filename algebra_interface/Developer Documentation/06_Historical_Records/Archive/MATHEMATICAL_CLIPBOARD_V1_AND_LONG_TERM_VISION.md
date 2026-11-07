# Mathematical Clipboard v1 — implementation, handover, and long-term vision

## Current student-facing scope

A student can select one mathematical AST node (a complete expression, a subtree, or a complete equality), click **Copy mathematics**, and later click **Paste as new object**. If nothing is selected, copying captures the active object's entire mathematical root. This is an **in-application clipboard**, not the operating system's text clipboard. It persists across object switches during the session, but not browser reloads. Copying several disjoint selected nodes at once is deliberately unsupported: those nodes do not necessarily form a single expression. The UI disables copying when more than one node is selected.

**This milestone does not yet implement adding or multiplying an external expression on both sides of an equation.** The clipboard is the first reusable, structured operand source for that later operation. Do not present copying as a proof of equality or a mathematical transformation.

## Code and information flow

- `js/core/mathematicalClipboard.js`: `captureMathematicalClipboard(root, nodeId, source)` clones the selected subtree, validates it, and stores provenance (source document ID, object ID, and original node ID). `pasteMathematicalClipboard(entry)` validates the entry, clones its AST, and allocates a **new ID for every node**. It never changes the clipboard itself.
- `js/core/workspaceDocuments.js`: `addObjectFromClipboard()` creates an independent object, with an initial `context-edit` history snapshot and optional copy provenance stored **outside the AST**.
- `js/core/documentController.js`: exposes the new object operation to the existing controller.
- `js/app.js`: keeps the clipboard in transient session state and wires the copy/paste buttons to existing selection and document-change paths. Selection and copy are not history events; pasting creates a new object, not an algebraic transformation of the source.
- `tests/mathematical-clipboard.test.js`: validates subtree isolation, whole equality copying, fresh identities, independent histories, compact serialization and invalid selections.

The clipboard does not retain substitutions: symbol names are copied as mathematical syntax, not bound to the source object's current numerical assignments. Future cross-object operations must define the interpretation of free symbols and assumptions explicitly.

## Important constraints and future decisions

1. **Mathematical types and permissions:** Future addition/multiplication of both equality sides must be defined by typed mathematical operations, not DOM insertion. Matrices require dimensional compatibility and noncommutative left/right multiplication. Multiplying an equation by zero can lose reversibility; distinguish implication from equivalence.
2. **Provenance:** Capture an immutable operand snapshot *and* source object/revision when applying a cross-object transformation. Changing the source later must not rewrite historical meaning. Copy provenance is not mathematical justification.
3. **Documents as worksheets:** A document owns many independent Mathematical Objects (expressions, relations, and eventually logical statements), their histories, and later annotations/layout. One-object-per-document is obsolete.
4. **Windows are views, not mathematical objects:** Multiple windows may show different parts, graphs or historical views of the same authoritative object. At most one editing view per object should issue active gestures. Visible views should stay current; deferred rendering must visibly identify stale views. Windows should support positioning, alignment snapping, docking and eventual tiling without changing mathematical meaning.
5. **Annotation layer:** Free ink, labels, circles, arrows and underbraces are distinct from mathematical content and interaction state. Structured annotations can anchor to stable node IDs or adjacent sibling ranges; they must not change the AST. Unresolved anchors must not silently jump to unrelated nodes. Annotation/layout history is distinct from mathematical history.
6. **Rendering:** Future vectors, matrices, inequalities, logical AND/OR and systems of equations need structured ASTs, type-aware rules, and specialized two-dimensional rendering. Mathematical truth, evaluator knowledge and teaching-policy disclosure are distinct concepts.
7. **Usability:** Preserve touch/mouse/keyboard selection and drag behaviour; future cross-object gestures must have an explicit preview, confirmation and cancellation. Avoid accidental commits when copying or selecting.

## Verification and release checklist

Run `npm test`, `npm run test:mutation`, `node scripts/mutation-quality-probes.js`, and `npm run test:e2e` on a clean install. Browser verification should include: copying a selected subtree, copying a whole equality, pasting multiple times, switching objects, undo/history, save/reload and compact export/import. Real-device touch behaviour remains important. If browser tests are not executed, label them pending rather than passed.

## Design debt, intentionally deferred

There is no system clipboard interoperability, no paste into an existing AST, no multi-node clipboard expression synthesis, no document-level undo for object creation, no source-history revision capture, and no cross-object equality transformations yet. Do not expand this milestone into a general theorem-prover or window manager.
