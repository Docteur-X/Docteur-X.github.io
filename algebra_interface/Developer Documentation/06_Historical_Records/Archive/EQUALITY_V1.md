# Equality v1 — recovered implementation (2026-11-03)

## Purpose and mathematical boundary

This version extends the existing arithmetic expression tree with one binary scalar relation, `Equal`. An expression denotes a value; an `Equal` node denotes a statement comparing two scalar expressions. The parser accepts exactly one **top-level** `=`. Nested or chained equalities are rejected. Statement nodes cannot be operands of `Add`, `Multiply`, or `Group`.

The `Equal` node stores `{id, type:"Equal", left, right}`. The expression parser retains a legacy top-level `Add` wrapper in some paths for compatibility; the renderer nevertheless accepts **any valid expression root** directly beneath `Equal` (including `Group`, `Multiply`, `Number` and `Symbol`). Mathematical transformations must target eligible subtrees, not assume the document root is `Add`. The two sides remain independent interaction regions.

## Files and division of responsibility

- `js/core/nodeCategories.js`: syntactic expression/statement classification and initial scalar-only validation; future matrix/vector value typing should be a separate concern.
- `js/relations/equality.js`: validated equality construction, symmetry (swap sides), conservative four-state evaluation. No DOM imports.
- `js/core/parser.js`: split one top-level `=`, parse each side with the original recursive-descent expression parser; preserve legacy parser errors for expression-only input.
- `js/core/treeUtils.js`, `normalization.js`, `mathJson.js`: visit, normalise, locate and serialise relation children; do not flatten across `=`.
- `js/rendering/domRenderer.js`: reuse the expression renderer twice, with a relation sign between the independent drag containers.
- `js/core/mathematicalDocument.js`: versioned document wrapper with root, category, metadata and a branch-ready history container.
- `js/app.js`: coordinate document root, existing history, Swap equality sides button and derived truth feedback; no equality mathematics in the controller.

## Truth feedback

The relation evaluator returns `{status, reason}` rather than writing truth into the AST. `true`, `false`, `unknown`, `undefined` are reserved statuses; v1 produces the first three for supported operations, with `undefined` reserved for future partial operations (e.g. division by zero). Literal comparisons `3=3` and `2=3` are directly checked; structurally identical sides use reflexivity subject to definedness. Arithmetic is **not silently simplified**: `1+2=3` remains unknown until the student evaluates it. Temporary variable assignments may be used to check satisfaction, not to prove universal identities.

## History and future provenance

The existing history already branches using parent/child links. v1 preserves it and adds `stateId`, `eventId`, and `kind` (`construction`, `free-edit`, `rule-transform`) to new history entries. The mathematical document references that history. Future cross-document provenance should use `{documentId,stateId,nodeId}` and reference the **historical** source state, not the mutable current state. **Historical v1 limitation, since resolved:** Workspace v1 now supports multiple independent documents and IndexedDB persistence with JSON import/export. Cross-document mathematical substitution remains future work; see `WORKSPACE_V1.md`.

## Future work, deliberately excluded

- Logical connectors `And`/`Or` and zero-product statement splitting.
- Matrix and Boolean value types, domain/definedness inference, inequalities and other relations.
- Chained equality, adding/multiplying on both sides, drag-to-swap, automatic solving.
- Free-edit subtree UI and cross-document substitution. Multiple-document workspaces and IndexedDB/JSON persistence have since been implemented (see `WORKSPACE_V1.md`).
- A complete type-checking registry and expression/statement-specific rule registration.

## Manual browser checks

1. Enter `a+b=c+d`; rearrange addends independently on either side. Verify that dragging cannot cross `=`.
2. Enter `a*(b+c)=d`; test distribution and grouping on the left.
3. Enter `3=3`, `2=3`, `x=3`, `x+x=x+x`; check green, red, neutral, and reflexivity.
4. Swap sides, undo via history, and redo via a new branch; verify stable operand IDs.
5. Enter `a=b=c`, `a==b`, `a=(b=c)`, `a=`, `=b`; verify helpful input errors.
6. Test on a narrow window and with both light and dark themes.

Automated Node tests do **not** replace actual pointer/layout verification.
