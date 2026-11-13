# AST Root Semantics v1 — meaningful expression roots

**Status:** implemented in source and covered by later owner-reported browser runs; see [Current Status](Current_Status.md). "Pending" notes below are historical.

## Problem and mathematical contract

The earlier parser `parseRoot()` returned `createAdd([expression])` whenever the
expression was not already an `Add`. This created an artificial root above
`((3))`, `a(b+c)`, `-(a+b)`, and even standalone symbols. The renderer inspector
exposed that root faithfully. It was not an inspector bug.

An expression now begins with its **actual outermost AST occurrence**:

| Input | Root | Scope |
|---|---|---|
| `3` | Number | literal |
| `((3))` | Group | outer explicit bracket pair |
| `a(b+c)` | Multiply | product |
| `-(a+b)` | Negate | unary negation |
| `a+b+c` | Add | n-ary addition |
| `a=b` | Equal | statement |

The root is a meaningful mathematical occurrence, not a parser or layout
wrapper. Explicit `Group` nodes must remain even when they are redundant for
numeric evaluation; they record the student's deliberately authored scope.

## Code boundaries and root replacement

- `js/engine/parser.js`: `parseRoot()` returns `parseSum()` directly. Equality
  sides are parsed with the same contract.
- `js/engine/treeUtils.js`: rule-aware normalization collapses unary Add and
  Multiply at *any* depth, including the root; it never manufactures a root.
  Callers **must use its return value**. The historical one-child Add factory
  remains accepted to read legacy snapshots without deleting IDs silently.
- `js/engine/operations/distribution.js`: root-level distribution returns the new
  Add root explicitly; the original input remains detached in the application
  commit path. The engine does not require a fake parent.
- `js/engine/operations/identityInsertion.js`: inserting an identity around the root
  returns a new operation as root while retaining the old root as its child.
- `js/engine/operations/grouping.js` and `js/app.js`: wrapping/unwrapping the root
  uses an explicit root-reference replacement, not an invented parent.
- `js/view/rendering/domRenderer.js`: already renders non-Add roots. The inspector
  continues to map the *real* AST, including any old wrappers in imported
  historical snapshots.

## History and backward compatibility

Do **not** silently rewrite stored history snapshots or imported Mathematical
Objects. Their node IDs and historical structure are evidence of past student
work. Historical unary Add roots may remain in old documents. A future explicit
migration would need separate identity/history tests and informed policy.

The existing historical rule tests were written around the former UI wrapper.
They use `tests/helpers/legacyRootParser.js` **only as a fixture adapter** to
preserve those test cases without modifying production parsing. This is a
transitional test debt, not the production API. New tests in
`tests/engine/ast-root-semantics.test.js` exercise the production parser directly.
Future maintenance should progressively migrate old tests to natural roots.

## Known limits / next work

- A meaningful AST root is not yet a promise that every operation root has an
  independent direct hitbox. Semantic container mapping makes this visible.
- No new structural navigation or target proxy behavior is implemented.
- Run the complete Playwright suite on Windows and GitHub Actions before
  accepting this as a browser-verified release. Pay special attention to
  root-level distribution, identity insertion, grouping, and history replay.

## v1.1 root-occurrence selection regression correction

With natural roots, `(((30)))` renders the outer Group as `.root-expression-hitbox`, not an ordinary Add operand. The equation click-selection path now resolves this root hitbox alongside `.nested-occurrence`, so clicking each bracket level selects its own AST occurrence. This is an interaction-only repair: no synthetic Add node is restored, no node IDs are rewritten, and selection creates no mathematical history entry. The existing nested-hitbox browser test is the regression guard; browser verification remains required for this increment.

Future Window Manager/view-slot design is documented separately in `Window_Manager_View_Slots_Future_Design.md`.
