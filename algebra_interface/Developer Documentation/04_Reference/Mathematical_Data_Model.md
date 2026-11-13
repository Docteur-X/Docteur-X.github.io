# Mathematical data model — source-oriented reference

Inspect `js/engine/nodeFactory.js`, `nodeCategories.js`, `operatorMetadata.js`, `treeUtils.js`, `parser.js`, `normalization.js`, `mathematicalDocument.js` and `documentController.js` for exact current schemas. AST nodes have stable occurrence IDs. A `Number` node's `value` is an exact string such as `"0.1"` or `"1234567890123"`, read and calculated with `js/engine/rational.js`; documents saved earlier hold plain numbers there, which are read as the exact decimal they display as. Explicit `Group` nodes preserve pedagogical brackets; renderer may add parentheses required by precedence without introducing a `Group` node.

An `Equal` relation contains scalar expression sides in the current implementation. Mathematical Objects have independent ASTs, symbol assignments and branching histories; Documents are collections of objects, not one equation each. A clipboard entry is a session snapshot, not a live reference or automatic new object. New occurrences need new IDs; unchanged subtrees should retain their IDs.

This page is a navigational reference rather than a complete JSON schema. Do not invent node variants, type/domain guarantees or relation semantics not supported by source. See [Documents and history](../06_Historical_Records/Superseded_2026-11-12/Documents_and_History.md).
