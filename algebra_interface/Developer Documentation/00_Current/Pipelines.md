# Pipelines: the four paths through the code

Each job has one path. This page names every file on it, in order; `tests/architecture/documentation-paths.test.js` checks that each named file exists. For the folders themselves, see [Overview](Overview.md).

## 1. Reading: text to tree

```text
"2x-3=y" ──► notation table ──► tokens ──► parser levels ──► normalised tree
```

1. **The notation table** (`js/engine/notation.js`) is assembled from the definitions: each operator's `notation` rows (`js/definitions/operators/<id>/index.js`), each relation's (`js/definitions/relations/<id>/index.js`), and each function's name (`\sin`). It lists every sign, its precedence, the node it builds and its error messages.
2. **The parser** (`js/engine/parser.js`) splits a statement at its relation sign (`=`, `<`, `>`), then reads each side: tokens (signs from the table, numbers, names, `\name` functions, brackets), then one infix level per operator (`+ −` build `Add`, `× · ÷` build `Multiply`, with juxtaposition and its refusals), prefix signs, and atoms (numbers, names, brackets, function calls). It names no sign itself (a test checks).
3. **Normalisation** (`js/engine/normalization.js`) flattens a nested sum or product where the operation is associative, asking `js/engine/structures.js`.
4. **The result** is a tree of plain objects (`js/engine/nodeFactory.js`), each with an occurrence ID. Its shape is in the node registry (`js/engine/nodeRegistry.js`).

The way back: `expressionToInput` and `expressionToDisplayString` in `js/engine/parser.js` print a tree from the table's print rows, with automatic brackets from `js/engine/operatorMetadata.js`. Every printed text reads back to the same tree. The canonical text form (`js/engine/canonicalText.js`) writes any tree unambiguously, for tests and identity rules.

## 2. Drawing: tree to page

```text
tree ──► renderer ──► boxes with labels ──► mounted, with targets refreshed
```

1. **The equation view** (`js/view/equationView.js`) asks the renderer for the whole tree.
2. **The renderer** (`js/view/rendering/domRenderer.js`) draws a relation as its two sides around its sign, and every operation as a row of boxes. How each node type is drawn is in `js/view/rendering/nodeSpecs.js`; how a sum or product row is styled comes from its operator (`js/definitions/operators/presentation.js`). Every part a student can point at gets its own box, labelled with its node ID and role.
3. **Mounting** (`js/view/equationPresentationMount.js`) replaces the page's equation in one step, then refreshes the semantic targets (`js/view/rendering/semanticTargetResolver.js`) and the spoken wording of each part (`js/view/actionWording.js`).

A preview draws a candidate tree with the same renderer, in place of the committed one (`js/view/preview/candidatePreview.js`).

## 3. A step: gesture to history

```text
gesture ──► rule ──► coordinator ──► preview ──► confirm ──► commit ──► history ──► page
```

1. **The gesture.** All input goes through the input router (`js/view/inputRouter.js`), which runs each route only in the view modes it allows (`js/view/viewMode.js`); nothing new starts unless the view is idle. A drag is handled by the drag code (`js/view/drag/ordinaryDragView.js`, with hit testing and arbitration in `js/view/drag/`), which offers the drop targets rules have registered. The gestures themselves are defined in `js/definitions/interactions/`.
2. **The rule** (its `install.js`, through the rule context `js/app/ruleContext.js`) turns the gesture into a request: a rule ID and parameters, no DOM.
3. **The coordinator** (`js/steps/transformationCoordinator.js`) looks the rule up (`js/steps/transformationFeatures.js`), checks that the type provides what the rule `requires` (`js/engine/structures.js`), asks the rule's Engine function for a result, restores the leading 1 before a ÷ (`js/engine/divisionInvariant.js`), and refuses a result that changes nothing. It returns a candidate `{ action, result }`.
4. **The preview.** The preview host (`js/steps/previewSessionHost.js`) holds the candidate with a source stamp; its presentation draws it (usually `js/view/preview/candidatePreview.js`: the result with the new parts in amber).
5. **Confirm.** Selecting an amber part, or Confirm, asks the host to commit; a stale stamp (the document changed meanwhile) is refused.
6. **Commit.** `ctx.commitTransformation` (`js/app/ruleContext.js`) prepares the new state and history step together (`js/steps/atomicTransformationCommit.js`, which appends to `js/documents/documentHistory.js`, with any assumptions such as `b ≠ 0` on the step), then publishes it (`js/steps/transformationPublication.js`) and asks the workspace to save.
7. **The page** is drawn again (pipeline 2), and the history view (`js/view/historyView.js`) shows the new step.

An immediate rule (no preview) goes straight from 3 to 6. When a result depends on something the student must say (multiplying an inequality by an expression of unknown sign), the Engine returns a question instead of a tree (`needsSign`); the rule asks it, then proposes again with the answer, which becomes the step's assumption (`js/engine/relations/applyToBothSides.js`, `js/rules/equality/install.js`).

## 4. Saving: document to storage

```text
live state ──► document ──► history with fingerprints ──► browser storage / exported file
```

1. **Capture.** After each commit the workspace (`js/app/workspace/workspaceSession.js`) captures the active object's tree, history and values into its document (`js/documents/workspaceDocuments.js`).
2. **History.** Each object keeps a branching history: events with patches, and snapshots with fingerprints (`js/documents/documentHistory.js`). A document must pass its invariants (`js/documents/documentInvariants.js`): valid trees (checked against the node registry), unique IDs, consistent history.
3. **Storage.** Saves are queued (`js/app/workspace/workspaceSaveCoordinator.js`) and written to the browser's IndexedDB (`js/documents/documentRepository.js`).
4. **Export and import** use the compact form (`js/documents/documentSerialization.js`); importing validates the document and reserves its node IDs, so new nodes never reuse a saved one. Documents saved in older forms still open (fixtures in `e2e/fixtures/`).
