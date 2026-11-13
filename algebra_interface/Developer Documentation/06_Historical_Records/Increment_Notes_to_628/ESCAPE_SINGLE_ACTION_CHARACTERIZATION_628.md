# Escape single-action characterization — browser verification pending

The previous source audit identified independently registered negation (document) and application (window) Escape listeners. `e2e/escape-single-action-boundary.spec.js` now tests a reachable overlap: a retained two-operand selection with an active negation preview. The first Escape should dismiss only the preview; the second should clear selection. Both must preserve MathJSON and history.

**Status:** This is an intentionally discriminating browser regression, not a confirmed production fix. If it fails, inspect listener ordering and dispatch ownership; do not change the shared Preview Session Host or mathematical rules merely to satisfy the test. If the initial selection cannot coexist with the preview, record that reachability evidence and adjust the investigation before refactoring.

The user reported the full browser suite passing on the preceding Escape audit release. This *new* test has not been browser-verified. Production code is unchanged.
